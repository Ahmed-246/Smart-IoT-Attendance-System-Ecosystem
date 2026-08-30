
import asyncio
from sqlalchemy import select
from app.db.database import AsyncSessionLocal as SessionLocal
from app.models.activity import SystemActivity
from datetime import datetime

async def check_times():
    async with SessionLocal() as db:
        result = await db.execute(
            select(SystemActivity.timestamp, SystemActivity.action_type, SystemActivity.description)
            .order_by(SystemActivity.timestamp.desc())
            .limit(10)
        )
        logs = result.all()
        
        print(f"Current local time: {datetime.now()}")
        print(f"Current UTC time: {datetime.utcnow()}")
        print("\nLast 10 logs in DB:")
        for ts, action, desc in logs:
            print(f"[{ts}] {action}: {desc}")

if __name__ == "__main__":
    asyncio.run(check_times())
