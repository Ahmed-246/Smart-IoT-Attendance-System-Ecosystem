
import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def fix_schema():
    async with AsyncSessionLocal() as db:
        print("Altering system_activities table...")
        
        # 1. Update NULL timestamps to current time
        await db.execute(text("UPDATE system_activities SET timestamp = CURRENT_TIMESTAMP WHERE timestamp IS NULL;"))
        
        # 2. Change column type to TIMESTAMPTZ and set default
        # PostgreSQL syntax for altering column type and default
        await db.execute(text("""
            ALTER TABLE system_activities 
            ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE 
            USING timestamp AT TIME ZONE 'UTC',
            ALTER COLUMN timestamp SET DEFAULT CURRENT_TIMESTAMP,
            ALTER COLUMN timestamp SET NOT NULL;
        """))
        
        await db.commit()
        print("Schema fixed successfully.")

if __name__ == "__main__":
    asyncio.run(fix_schema())
