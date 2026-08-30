import asyncio
import sys
import os

# Add current path to sys.path so we can import app
sys.path.append(os.getcwd())

from app.db.database import AsyncSessionLocal
from app.models.device import Device
from sqlalchemy import delete

async def clear_devices():
    print("[CLEANUP] Starting database wipe...")
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(delete(Device))
            await db.commit()
            print("[SUCCESS] All devices have been deleted.")
        except Exception as e:
            print(f"[ERROR] Database cleanup failed: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(clear_devices())
