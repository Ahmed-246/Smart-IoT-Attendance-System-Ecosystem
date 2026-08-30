
import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def check_schema():
    async with AsyncSessionLocal() as db:
        # Check system_activities table schema
        res = await db.execute(text("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'system_activities' AND column_name = 'timestamp';
        """))
        row = res.fetchone()
        print(f"SystemActivity timestamp schema: {row}")

        # Check session_telemetry table schema
        res = await db.execute(text("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'session_telemetry' AND column_name = 'timestamp';
        """))
        row = res.fetchone()
        print(f"SessionTelemetry timestamp schema: {row}")

if __name__ == "__main__":
    asyncio.run(check_schema())
