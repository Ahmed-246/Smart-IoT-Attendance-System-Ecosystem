import asyncio
import sys, os
sys.path.insert(0, os.getcwd())

from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def migrate():
    async with AsyncSessionLocal() as db:
        await db.execute(text("ALTER TABLE students ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE"))
        await db.commit()
        print("Added rejected_at column successfully")

asyncio.run(migrate())
