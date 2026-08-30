import asyncio
import os
import sys

# Setup path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, func
from app.db.database import AsyncSessionLocal
from app.models import * # Import all via __init__

async def check_db_orm():
    async with AsyncSessionLocal() as db:
        try:
            # Check SystemActivity
            stmt = select(func.count(SystemActivity.id))
            count = (await db.execute(stmt)).scalar()
            print(f"SystemActivity count: {count}")
            
            # Check for NULL timestamps
            null_ts_stmt = select(func.count(SystemActivity.id)).where(SystemActivity.timestamp == None)
            null_ts_count = (await db.execute(null_ts_stmt)).scalar()
            print(f"SystemActivity with NULL timestamp: {null_ts_count}")
            
            if count > 0:
                latest_stmt = select(SystemActivity).order_by(SystemActivity.timestamp.desc().nulls_last()).limit(1)
                latest = (await db.execute(latest_stmt)).scalar()
                if latest:
                    print(f"Latest activity: {latest.description} at {latest.timestamp}")
                
                # Check recent logs
                recent_stmt = select(SystemActivity).order_by(SystemActivity.timestamp.desc().nulls_last()).limit(5)
                recent = (await db.execute(recent_stmt)).scalars().all()
                for r in recent:
                    print(f"Log: {r.description} | TS: {r.timestamp} | Priority: {r.priority}")

        except Exception as e:
            print(f"Error checking DB ORM: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_db_orm())
