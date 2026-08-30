from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import csv
import io

from app.db.database import get_db
from app.core.security import require_super_admin, verify_password, require_capability_or_super_admin
from app.models.activity import SystemActivity, ActivityPriority, ActivityAction, SessionTelemetry
from app.models.user import User, UserRole
from sqlalchemy.orm import aliased
from app.core.security import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

# Define access dependency for all monitoring routes
require_monitoring_access = Depends(require_capability_or_super_admin("SYSTEM_LOG_AUDIT"))

@router.get("/summary", dependencies=[require_monitoring_access])
async def get_monitoring_summary(db: AsyncSession = Depends(get_db)):
    """
    Returns high-level stats for the monitoring dashboard.
    """
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    
    # Total logs
    total_logs = await db.execute(select(func.count(SystemActivity.id)))
    total_logs = total_logs.scalar()
    
    # Critical alerts in last 24h
    critical_24h = await db.execute(
        select(func.count(SystemActivity.id))
        .where(SystemActivity.priority == ActivityPriority.CRITICAL)
        .where(SystemActivity.timestamp >= last_24h)
    )
    critical_24h = critical_24h.scalar()
    
    # Warning/Caution alerts in last 24h
    warnings_24h = await db.execute(
        select(func.count(SystemActivity.id))
        .where(SystemActivity.priority.in_([ActivityPriority.WARNING, ActivityPriority.CAUTION]))
        .where(SystemActivity.timestamp >= last_24h)
    )
    warnings_24h = warnings_24h.scalar()

    # Active Sessions (Distinct users in last 15 mins)
    last_15m = now - timedelta(minutes=15)
    active_sessions = await db.execute(
        select(func.count(func.distinct(SystemActivity.user_id)))
        .where(SystemActivity.timestamp >= last_15m)
    )
    active_sessions = active_sessions.scalar() or 0

    # Get recent critical/warning logs
    recent_alerts_result = await db.execute(
        select(SystemActivity)
        .where(SystemActivity.priority.in_([ActivityPriority.CRITICAL, ActivityPriority.WARNING]))
        .order_by(desc(SystemActivity.timestamp))
        .limit(5)
    )
    recent_alerts = recent_alerts_result.scalars().all()

    # Serialize recent alerts manually to avoid Enum/DateTime serialization issues in raw dict return
    serialized_alerts = []
    for alert in recent_alerts:
        serialized_alerts.append({
            "id": alert.id,
            "timestamp": alert.timestamp.strftime('%Y-%m-%dT%H:%M:%SZ') if alert.timestamp else None,
            "user_name": alert.user_name,
            "user_email": alert.user_email,
            "user_role": alert.user_role,
            "action_type": alert.action_type.value if hasattr(alert.action_type, 'value') else str(alert.action_type),
            "priority": alert.priority.value if hasattr(alert.priority, 'value') else str(alert.priority),
            "description": alert.description,
            "target_model": alert.target_model
        })

    return {
        "total_logs": total_logs,
        "critical_24h": critical_24h,
        "warnings_24h": warnings_24h,
        "active_sessions": active_sessions,
        "recent_alerts": serialized_alerts
    }

@router.get("/logs", dependencies=[require_monitoring_access])
async def get_logs(
    db: AsyncSession = Depends(get_db),
    role: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    target: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0)
):
    """
    Returns filtered, paginated logs for the audit hub.
    """
    stmt = select(SystemActivity).order_by(desc(SystemActivity.timestamp))
    
    if role:
        stmt = stmt.where(SystemActivity.user_role == role)
    if priority:
        stmt = stmt.where(SystemActivity.priority == priority)
    if action:
        stmt = stmt.where(SystemActivity.action_type == action)
    if target:
        stmt = stmt.where(SystemActivity.target_model == target)
    if search:
        stmt = stmt.where(
            (SystemActivity.description.ilike(f"%{search}%")) |
            (SystemActivity.user_email.ilike(f"%{search}%")) |
            (SystemActivity.user_name.ilike(f"%{search}%"))
        )
    if start_date:
        try:
            # handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM
            dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            stmt = stmt.where(SystemActivity.timestamp >= dt)
        except ValueError:
            pass
    if end_date:
        try:
            dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            stmt = stmt.where(SystemActivity.timestamp <= dt)
        except ValueError:
            pass
        
    # Count total for pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.execute(count_stmt)
    total = total.scalar()
    
    # Fetch data
    result = await db.execute(stmt.limit(limit).offset(offset))
    logs = result.scalars().all()
    
    # Post-process to calculate telemetry counts directly for LOGIN rows
    enhanced_logs = []
    
    for log in logs:
        l_dict = {
            "id": log.id,
            "timestamp": log.timestamp.strftime('%Y-%m-%dT%H:%M:%SZ') if log.timestamp else None,
            "user_id": log.user_id,
            "user_email": log.user_email,
            "user_role": log.user_role,
            "user_name": log.user_name,
            "user_avatar": log.user_avatar,
            "action_type": log.action_type.value if hasattr(log.action_type, 'value') else str(log.action_type or "UNKNOWN"),
            "priority": log.priority.value if hasattr(log.priority, 'value') else str(log.priority or "NORMAL"),
            "target_model": log.target_model,
            "target_id": log.target_id,
            "description": log.description,
            "details_json": log.details_json,
            "session_id": log.session_id,
            "telemetry_count": 0,
            "session_status": "NONE"
        }
        
        if log.action_type == ActivityAction.LOGIN and log.session_id:
            # Check how many telemetry actions occurred
            tel_count_stmt = select(func.count(SessionTelemetry.id)).where(SessionTelemetry.session_id == log.session_id)
            c_res = await db.execute(tel_count_stmt)
            l_dict["telemetry_count"] = c_res.scalar() or 0
            
            # Check if there is a LOGOUT
            logout_stmt = select(SystemActivity).where(
                SystemActivity.session_id == log.session_id,
                SystemActivity.action_type == ActivityAction.LOGOUT
            )
            logout_res = await db.execute(logout_stmt)
            has_logged_out = logout_res.scalars().first() is not None
            
            # Check 30 min expiration

            is_expired = False
            if log.timestamp:
                expire_time = log.timestamp
                if log.timestamp.tzinfo is None:
                    expire_time = log.timestamp.replace(tzinfo=timezone.utc)
                expire_time = expire_time + timedelta(minutes=30)
                
                if datetime.now(timezone.utc) > expire_time:
                    is_expired = True

            if has_logged_out:
                l_dict["session_status"] = "LOGGED_OUT"
            elif is_expired:
                l_dict["session_status"] = "EXPIRED"
            else:
                l_dict["session_status"] = "ACTIVE"
                
        enhanced_logs.append(l_dict)

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": enhanced_logs
    }

class TelemetryEventPayload(BaseModel):
    action_type: str
    path: Optional[str] = None
    description: Optional[str] = None
    details_json: Optional[dict] = None

class TelemetryBatchPayload(BaseModel):
    events: List[TelemetryEventPayload]

@router.post("/telemetry")
async def log_session_telemetry(
    payload: TelemetryBatchPayload,
    current_user: dict = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    Receives an array of lightweight telemetry events from the frontend.
    Strictly silent execution, does not return errors to the frontend to avoid noise.
    """
    session_id = current_user.get("session_id")
    if not session_id:
        return {"status": "ignored", "reason": "no session id"}
        
    for ev in payload.events:
        tel = SessionTelemetry(
            session_id=session_id,
            action_type=ev.action_type,
            path=ev.path,
            description=ev.description,
            details_json=ev.details_json,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(tel)
    await db.commit()
    return {"status": "ok", "received": len(payload.events)}

def serialize_activity(log):
    if not log: return None
    return {
        "id": log.id,
        "timestamp": log.timestamp.strftime('%Y-%m-%dT%H:%M:%SZ') if log.timestamp else None,
        "user_email": log.user_email,
        "user_role": log.user_role,
        "user_name": log.user_name,
        "action_type": log.action_type.value if hasattr(log.action_type, 'value') else str(log.action_type),
        "priority": log.priority.value if hasattr(log.priority, 'value') else str(log.priority),
        "description": log.description,
        "details_json": log.details_json
    }

def serialize_telemetry(tel):
    if not tel: return None
    return {
        "id": tel.id,
        "timestamp": tel.timestamp.strftime('%Y-%m-%dT%H:%M:%SZ') if tel.timestamp else None,
        "action_type": tel.action_type.value if hasattr(tel.action_type, 'value') else str(tel.action_type),
        "path": tel.path,
        "description": tel.description,
        "details_json": tel.details_json
    }

@router.get("/session/{session_id}", dependencies=[require_monitoring_access])
async def get_session_details(session_id: str, db: AsyncSession = Depends(get_db)):
    """
    Gets full bookended timeline for a specific session ID.
    Returns the LOGIN event, the LOGOUT event (if exists), and all telemetry in between.
    """
    # 1. Get primary login event to extract user info
    login_result = await db.execute(
        select(SystemActivity)
        .where(SystemActivity.session_id == session_id, SystemActivity.action_type == ActivityAction.LOGIN)
    )
    login_event = login_result.scalar_one_or_none()
    
    if not login_event:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # 2. Get logout event if exists
    logout_result = await db.execute(
        select(SystemActivity)
        .where(SystemActivity.session_id == session_id, SystemActivity.action_type == ActivityAction.LOGOUT)
    )
    logout_event = logout_result.scalar_one_or_none()
    
    # 3. Get all micro-telemetry
    tel_result = await db.execute(
        select(SessionTelemetry)
        .where(SessionTelemetry.session_id == session_id)
        .order_by(SessionTelemetry.timestamp.asc())
    )
    telemetry_logs = tel_result.scalars().all()
    
    return {
        "user_info": {
            "name": login_event.user_name,
            "email": login_event.user_email,
            "role": login_event.user_role,
            "avatar": login_event.user_avatar
        },
        "login": serialize_activity(login_event),
        "logout": serialize_activity(logout_event),
        "telemetry": [serialize_telemetry(t) for t in telemetry_logs]
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  EXPORT LOGS AS CSV
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/logs/export", dependencies=[require_monitoring_access])
async def export_logs_csv(db: AsyncSession = Depends(get_db)):
    """
    Exports ALL system activity logs as a professionally formatted CSV file.
    Filename is auto-generated: Logs_Cache_YYYY-MM-DD_HH-MM-SS.csv
    """
    # Fetch all logs sorted by newest first
    result = await db.execute(
        select(SystemActivity).order_by(desc(SystemActivity.timestamp))
    )
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    # ── Header Row ──
    writer.writerow([
        "Log ID",
        "Date",
        "Time",
        "User Name",
        "User Email",
        "User Role",
        "Action Type",
        "Priority",
        "Description",
        "Target Model",
        "Target ID",
        "Session ID",
        "Change Details"
    ])

    # ── Data Rows ──
    for log in logs:
        # Parse timestamp into separate date and time
        if log.timestamp:
            ts = log.timestamp
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            # Convert to Cairo time (UTC+2)
            cairo_offset = timedelta(hours=2)
            cairo_ts = ts + cairo_offset
            date_str = cairo_ts.strftime("%Y-%m-%d")
            time_str = cairo_ts.strftime("%I:%M:%S %p")
        else:
            date_str = "---"
            time_str = "---"

        # Format action type
        action = log.action_type.value if hasattr(log.action_type, 'value') else str(log.action_type or "UNKNOWN")

        # Format priority
        priority = log.priority.value if hasattr(log.priority, 'value') else str(log.priority or "NORMAL")

        # Format role for readability
        role_map = {
            "super_admin": "Super Admin",
            "admin": "Admin",
            "doctor": "Doctor",
            "engineer": "Engineer",
            "student": "Student"
        }
        role = role_map.get(log.user_role, log.user_role or "System")

        # Format change details from JSON diff
        details = ""
        if log.details_json:
            if isinstance(log.details_json, dict):
                diff = log.details_json.get("diff", {})
                if diff:
                    parts = []
                    for key, val in diff.items():
                        old_v = val.get("old", "None") if isinstance(val, dict) else "?"
                        new_v = val.get("new", "None") if isinstance(val, dict) else "?"
                        parts.append(f"{key}: {old_v} → {new_v}")
                    details = " | ".join(parts)
                else:
                    import json as json_mod
                    details = json_mod.dumps(log.details_json, ensure_ascii=False)

        writer.writerow([
            log.id,
            date_str,
            time_str,
            log.user_name or "System",
            log.user_email or "---",
            role,
            action,
            priority,
            log.description or "---",
            log.target_model or "---",
            log.target_id or "---",
            log.session_id or "---",
            details or "No change details"
        ])

    # Generate filename
    now_cairo = datetime.now(timezone.utc) + timedelta(hours=2)
    filename = f"Logs_Cache_{now_cairo.strftime('%Y-%m-%d_%H-%M-%S')}.csv"

    output.seek(0)
    
    # Add BOM for Excel compatibility
    bom = '\ufeff'
    csv_content = bom + output.getvalue()
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  CLEAR LOGS CACHE (Password-protected)
# ═══════════════════════════════════════════════════════════════════════════════

class ClearLogsPayload(BaseModel):
    password: str

@router.post("/logs/clear")
async def clear_logs_cache(
    payload: ClearLogsPayload,
    current_user: dict = Depends(require_capability_or_super_admin("SYSTEM_DATA_PURGE")),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently deletes ALL system activity logs and session telemetry.
    Requires the Super Admin's password for security confirmation.
    """
    # 1. Must be super_admin
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admins can clear logs.")

    # 2. Verify password against the user's stored hash
    user_result = await db.execute(
        select(User).where(User.id == current_user.get("user_id"))
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password. Logs were NOT cleared.")

    # 3. Count before deletion for the response
    count_result = await db.execute(select(func.count(SystemActivity.id)))
    total_deleted = count_result.scalar() or 0

    tel_count_result = await db.execute(select(func.count(SessionTelemetry.id)))
    tel_deleted = tel_count_result.scalar() or 0

    # 4. Delete all telemetry first (foreign key safety), then all logs
    await db.execute(delete(SessionTelemetry))
    await db.execute(delete(SystemActivity))
    await db.commit()

    return {
        "status": "cleared",
        "logs_deleted": total_deleted,
        "telemetry_deleted": tel_deleted,
        "message": f"Successfully cleared {total_deleted} activity logs and {tel_deleted} telemetry records."
    }

@router.get("/active-users", dependencies=[require_monitoring_access])
async def get_active_users_by_role(db: AsyncSession = Depends(get_db)):
    """
    Returns a list of users considered 'Online' (activity in last 15 mins),
    grouped by their system roles.
    """
    now = datetime.now(timezone.utc)
    last_15m = now - timedelta(minutes=15)
    
    # Subquery for latest activity timestamp per user
    # We check both SystemActivity and SessionTelemetry
    
    # 1. Get user IDs with recent activity
    recent_activity_ids = await db.execute(
        select(SystemActivity.user_id)
        .where(SystemActivity.timestamp >= last_15m)
        .distinct()
    )
    user_ids = {row[0] for row in recent_activity_ids.all() if row[0]}
    
    # 2. Get session IDs with recent telemetry (to find users who might only be navigating)
    # We join with SystemActivity to get the user_id for those session_ids
    recent_telemetry_users = await db.execute(
        select(SystemActivity.user_id)
        .join(SessionTelemetry, SystemActivity.session_id == SessionTelemetry.session_id)
        .where(SessionTelemetry.timestamp >= last_15m)
        .distinct()
    )
    user_ids.update({row[0] for row in recent_telemetry_users.all() if row[0]})
    
    if not user_ids:
        return {role.value: [] for role in UserRole if role.value != 'student'}

    # 3. Fetch user details and latest activity for these IDs
    active_users_data = []
    for uid in user_ids:
        user_res = await db.execute(select(User).where(User.id == uid))
        user = user_res.scalar_one_or_none()
        if not user or user.role == UserRole.student:
            continue
            
        # Find latest activity timestamp
        latest_act_res = await db.execute(
            select(func.max(SystemActivity.timestamp))
            .where(SystemActivity.user_id == uid)
            .where(SystemActivity.timestamp >= last_15m)
        )
        latest_act = latest_act_res.scalar()
        
        latest_tel_res = await db.execute(
            select(func.max(SessionTelemetry.timestamp))
            .join(SystemActivity, SystemActivity.session_id == SessionTelemetry.session_id)
            .where(SystemActivity.user_id == uid)
            .where(SessionTelemetry.timestamp >= last_15m)
        )
        latest_tel = latest_tel_res.scalar()
        
        # Determine final latest timestamp
        timestamps = [t for t in [latest_act, latest_tel] if t]
        final_ts = max(timestamps) if timestamps else last_15m
        
        active_users_data.append({
            "id": user.id,
            "name": user.name or user.email.split('@')[0],
            "email": user.email,
            "role": user.role.value,
            "avatar": user.profile_image_url,
            "last_active": final_ts.strftime('%Y-%m-%dT%H:%M:%SZ')
        })

    # 4. Group by role
    grouped = {
        "super_admin": [],
        "admin": [],
        "doctor": [],
        "engineer": []
    }
    
    for u in active_users_data:
        if u["role"] in grouped:
            grouped[u["role"]].append(u)
            
    return grouped

