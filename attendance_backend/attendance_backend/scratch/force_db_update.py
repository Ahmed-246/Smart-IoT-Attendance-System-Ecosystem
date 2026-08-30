import asyncio
import sys
import os
from sqlalchemy import text

# Add parent directory to path to find app module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import engine

async def fix():
    print("Connecting to database...")
    async with engine.begin() as conn:
        print("Adding columns...")
        await conn.execute(text('ALTER TABLE devices ADD COLUMN IF NOT EXISTS mac_address VARCHAR(50) UNIQUE'))
        await conn.execute(text('ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 0'))
        await conn.execute(text('ALTER TABLE devices ALTER COLUMN device_name DROP NOT NULL'))
        await conn.execute(text('ALTER TABLE devices ALTER COLUMN api_key DROP NOT NULL'))
    print("Database Schema Fixed Successfully!")

if __name__ == "__main__":
    asyncio.run(fix())
