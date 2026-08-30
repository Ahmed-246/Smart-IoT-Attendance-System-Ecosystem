from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db

settings = get_settings()

bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
):
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    token_session_id = payload.get("session_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: Missing user_id")

    # STRICT SINGLE SESSION ENFORCEMENT
    from app.models.user import User
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    # If the token has no session_id (legacy) or it doesn't match the DB (new login elsewhere)
    if not token_session_id or user.current_session_id != token_session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidated. Account logged in on another device.",
            headers={"WWW-Authenticate": "Bearer"},
        )
            
    return payload  # contains: sub (email), role, user_id, session_id


def require_role(*roles: str):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {list(roles)}",
            )
        return current_user
    return role_checker


def require_capability_or_super_admin(capability_name: str):
    """Allows access if user is super_admin OR has the specific capability."""
    async def checker(current_user: dict = Depends(get_current_user)):
        is_super = current_user.get("role") == "super_admin"
        caps = current_user.get("capabilities", [])
        if not is_super and capability_name not in caps:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires SUPER_ADMIN or {capability_name} capability.",
            )
        return current_user
    return checker


from fastapi import Request
from app.models.system_config import SystemConfig
from sqlalchemy import select

async def verify_system_lockdown(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sovereign Lockdown Middleware Dependency.
    Blocks any POST/PUT/PATCH/DELETE mutations if the system is locked,
    unless the user is a super_admin.
    """
    # Safe methods are always allowed (GET, OPTIONS, HEAD)
    if request.method in ["GET", "OPTIONS", "HEAD"]:
        return current_user

    # Super admins are immune to lockdown
    if current_user.get("role") == "super_admin":
        return current_user

    # Check the database for the global lock state
    result = await db.execute(select(SystemConfig).limit(1))
    config = result.scalars().first()
    
    if config and config.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aegis Lockdown Active: System is in read-only mode for emergency maintenance.",
        )
        
    return current_user


# Shortcuts
require_super_admin = require_role("super_admin")
require_admin = require_role("super_admin", "admin")
require_doctor = require_role("super_admin", "admin", "doctor")
require_engineer = require_role("super_admin", "admin", "doctor", "engineer")
require_any = require_role("super_admin", "admin", "doctor", "engineer", "student")
