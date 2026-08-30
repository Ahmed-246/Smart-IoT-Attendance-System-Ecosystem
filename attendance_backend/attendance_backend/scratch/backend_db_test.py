import asyncio
import sys
import os

# Add the parent directory to sys.path to import app
sys.path.append(os.getcwd())

from app.db.database import AsyncSessionLocal as SessionLocal, engine
from sqlalchemy import select, func
from app.models.activity import SystemActivity, SessionTelemetry

async def check_counts():
    async with SessionLocal() as db:
        res = await db.execute(select(func.count(SystemActivity.id)))
        total_logs = res.scalar()
        
        res = await db.execute(select(func.count(SessionTelemetry.id)))
        total_telemetry = res.scalar()
        
        print(f"Total Logs in DB: {total_logs}")
        print(f"Total Telemetry in DB: {total_telemetry}")
        
        # Check first 5 logs
        res = await db.execute(select(SystemActivity).limit(5))
        logs = res.scalars().all()
        for log in logs:
            print(f"Log ID: {log.id}, Active: {log.action_type}, TS: {log.timestamp}")

if __name__ == "__main__":
    asyncio.run(check_counts())
