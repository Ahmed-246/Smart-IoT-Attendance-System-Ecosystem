import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from app.db.database import AsyncSessionLocal
from app.models.session import Session
from app.models.attendance import Attendance

logger = logging.getLogger(__name__)


async def cleanup_old_sessions():
    """Delete sessions (and their attendance records) older than 30 days.
    Runs every 24 hours as a background task.
    """
    while True:
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=30)
            async with AsyncSessionLocal() as db:
                # Find old ended sessions
                result = await db.execute(
                    select(Session.id).where(
                        Session.is_active == False,
                        Session.end_time < cutoff,
                    )
                )
                old_session_ids = [row[0] for row in result.all()]

                if old_session_ids:
                    # Delete attendance records for those sessions
                    await db.execute(
                        delete(Attendance).where(Attendance.session_id.in_(old_session_ids))
                    )
                    # Delete the sessions themselves
                    await db.execute(
                        delete(Session).where(Session.id.in_(old_session_ids))
                    )
                    await db.commit()
                    logger.info(f"[CLEANUP] Deleted {len(old_session_ids)} sessions older than 30 days")
                else:
                    logger.info("[CLEANUP] No old sessions to clean up")

        except Exception as e:
            logger.error(f"[CLEANUP] Error during cleanup: {e}")

        # Wait 24 hours before next run
        await asyncio.sleep(86400)
async def cleanup_expired_capabilities():
    """Periodically removes user capabilities that have passed their expiration date."""
    from app.models.permission import UserCapability
    while True:
        try:
            now = datetime.now(timezone.utc)
            async with AsyncSessionLocal() as db:
                # Find expired capabilities (where expires_at is NOT NULL and is in the past)
                result = await db.execute(
                    select(UserCapability).where(
                        UserCapability.expires_at != None,
                        UserCapability.expires_at < now
                    )
                )
                expired_caps = result.scalars().all()

                if expired_caps:
                    for cap in expired_caps:
                        await db.delete(cap)
                    await db.commit()
                    logger.info(f"[CLEANUP] Automatically revoked {len(expired_caps)} expired capabilities.")
                else:
                    logger.debug("[CLEANUP] No expired capabilities found.")

        except Exception as e:
            logger.error(f"[CLEANUP] Error during capability cleanup: {e}")

        # Check every 10 minutes for granular enforcement
        await asyncio.sleep(600)
