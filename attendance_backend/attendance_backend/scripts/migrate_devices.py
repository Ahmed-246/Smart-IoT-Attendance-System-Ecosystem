import asyncio
import sys
import os

# Add current path to sys.path so we can import app
sys.path.append(os.getcwd())

from app.db.database import AsyncSessionLocal
from sqlalchemy import text

async def migrate():
    print("[MIGRATION] Adding 'last_seen' column to devices table...")
    async with AsyncSessionLocal() as db:
        try:
            # Add column if it doesn't exist
            await db.execute(text("ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE"))
            await db.commit()
            print("[SUCCESS] Column added successfully.")
        except Exception as e:
            print(f"[ERROR] Migration failed: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(migrate())
