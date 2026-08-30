from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import json

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.permission import UserCapability
from pydantic import BaseModel

router = APIRouter()

# Dependency to ensure only super admins access this subset
async def get_super_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != UserRole.super_admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires Super Admin Tier 1 privileges"
        )
    return current_user

class CapabilityAssign(BaseModel):
    capability_name: str
    expires_at: Optional[datetime] = None

class CapabilityResponse(BaseModel):
    capability_name: str
    granted_by: Optional[int] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AdminUserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    role: str
    capabilities: List[CapabilityResponse] = []
    
    class Config:
        from_attributes = True

@router.get("/users", response_model=List[AdminUserResponse])
async def get_admin_users(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_super_admin)):
    """Fetch all users that typically run administrative tasks (non-students) alongside their ABAC capabilities"""
    query = select(User).options(selectinload(User.capabilities)).where(
        User.role.in_([UserRole.super_admin, UserRole.admin, UserRole.doctor, UserRole.engineer])
    ).order_by(User.role, User.name)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users

@router.post("/users/{user_id}/capabilities")
async def assign_capability(
    user_id: int, 
    capability: CapabilityAssign, 
    db: AsyncSession = Depends(get_db), 
    current_user: dict = Depends(get_super_admin)
):
    """Assigns an elevated capability to a user."""
    # Check if user exists
    target = await db.scalar(select(User).where(User.id == user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if capability already active
    existing = await db.scalar(
        select(UserCapability)
        .where(UserCapability.user_id == user_id)
        .where(UserCapability.capability_name == capability.capability_name.upper())
    )
    
    if existing:
        # Update expiry if given
        existing.expires_at = capability.expires_at
        existing.granted_by = current_user.get("user_id")
        await db.commit()
        return {"message": "Capability updated."}
        
    new_cap = UserCapability(
        user_id=user_id,
        capability_name=capability.capability_name.upper(),
        granted_by=current_user.get("user_id"),
        expires_at=capability.expires_at
    )
    db.add(new_cap)
    await db.commit()
    
    return {"message": "Capability assigned."}

@router.delete("/users/{user_id}/capabilities/{capability_name}")
async def revoke_capability(
    user_id: int, 
    capability_name: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: dict = Depends(get_super_admin)
):
    """Revokes an elevated capability."""
    existing = await db.scalar(
        select(UserCapability)
        .where(UserCapability.user_id == user_id)
        .where(UserCapability.capability_name == capability_name.upper())
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Capability not active for this user")
        
    await db.delete(existing)
    await db.commit()
    
    return {"message": "Capability revoked."}

class AIChatRequest(BaseModel):
    task_description: str

@router.post("/assistant/recommend")
async def ai_assistant_recommend(req: AIChatRequest, current_user: dict = Depends(get_super_admin)):
    """Simulates an AI backend matching agent for assigning capabilities based on raw text tasks."""
    text = req.task_description.lower()
    
    recommendation = {
        "base_role": "admin",
        "capabilities": [],
        "reasoning": "Standard administrative access."
    }
    
    # Internal Rule-Matching Engine
    if "billing" in text or "finance" in text or "budget" in text:
        recommendation["capabilities"].append("MANAGE_FINANCE")
        recommendation["reasoning"] = "Task involves financial oversight requiring the MANAGE_FINANCE capability."
        
    if "audit" in text or "logs" in text or "monitor" in text:
        recommendation["base_role"] = "super_admin"
        recommendation["capabilities"].append("SYSTEM_LOG_AUDIT")
        recommendation["reasoning"] = "Task requires system-level overview and audit logging, recommending Super Admin overlay."
        
    if "doctor" in text or "clinical" in text or "medical" in text:
        recommendation["base_role"] = "doctor"
        recommendation["reasoning"] = "Clinical responsibilities suggest a Base Role of Doctor."
        
    if "security" in text or "override" in text or "bypass" in text:
        recommendation["capabilities"].append("SECURITY_OVERRIDE")
        recommendation["reasoning"] += " Required bypass security mechanisms to execute target functionality."
        
    if "grades" in text or "scores" in text or "assessment" in text:
        recommendation["capabilities"].append("EDIT_GRADES")
        recommendation["reasoning"] += " Explicit editing of protected grades identified."
        
    # Default fallback
    if not recommendation["capabilities"]:
        recommendation["capabilities"].append("VIEW_ONLY_DASHBOARDS")
        recommendation["reasoning"] = "No specific sensitive operations identified. Suggesting standard View-Only access."
        
    return recommendation
