from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from app.models.activity import SystemActivity, ActivityPriority, ActivityAction
from app.models.user import User

async def log_activity(
    db: AsyncSession,
    user_id: int,
    user_email: str,
    user_role: str,
    user_name: str,
    action: ActivityAction,
    description: str,
    priority: ActivityPriority = ActivityPriority.NORMAL,
    target_model: str = None,
    target_id: str = None,
    details: dict = None,
    ip_address: str = None,
    user_avatar: str = None,
    session_id: str = None,
    timestamp: datetime = None
):
    """
    Standardizes system auditing. Auto-fetches avatar if missing.
    """
    if not timestamp:
        timestamp = datetime.now(timezone.utc)

    if not user_avatar:
        from sqlalchemy import select
        from app.models.user import User
        # We try to get it from the DB session if already loaded, otherwise fetch
        user_result = await db.execute(select(User).where(User.id == user_id))
        user_obj = user_result.scalar_one_or_none()
        if user_obj:
            user_avatar = user_obj.profile_image_url

    activity = SystemActivity(
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        user_name=user_name,
        user_avatar=user_avatar,
        action_type=action,
        priority=priority,
        target_model=target_model,
        target_id=str(target_id) if target_id else None,
        description=description,
        details_json=details,
        ip_address=ip_address,
        session_id=session_id,
        timestamp=timestamp
    )
    db.add(activity)
    await db.flush()
    return activity
