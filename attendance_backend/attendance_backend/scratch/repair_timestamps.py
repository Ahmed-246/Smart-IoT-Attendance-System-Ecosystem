import asyncio
import os
import sys
from datetime import datetime, timedelta

# Setup path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import update, text
from app.db.database import AsyncSessionLocal
from app.models.activity import SystemActivity

async def repair_timestamps():
    async with AsyncSessionLocal() as db:
        try:
            # Set NULL timestamps to a baseline date (e.g., April 20, 2026)
            baseline = datetime(2026, 4, 20, 12, 0, 0)
            
            # Use raw SQL to update for simplicity and to avoid side effects
            res = await db.execute(
                text("UPDATE system_activities SET timestamp = :baseline WHERE timestamp IS NULL"),
                {"baseline": baseline}
            )
            await db.commit()
            print(f"Repaired {res.rowcount} records with NULL timestamps.")
            
            # Also check session_telemetry
            res_tel = await db.execute(
                text("UPDATE session_telemetry SET timestamp = :baseline WHERE timestamp IS NULL"),
                {"baseline": baseline}
            )
            await db.commit()
            print(f"Repaired {res_tel.rowcount} telemetry records with NULL timestamps.")

        except Exception as e:
            print(f"Error repairing timestamps: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(repair_timestamps())
