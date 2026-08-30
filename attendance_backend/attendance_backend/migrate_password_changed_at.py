"""
Migration: Add password_changed_at column to users table.
Run once: python migrate_password_changed_at.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/attendance_db"

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'users' AND column_name = 'password_changed_at'"
        ))
        if result.fetchone():
            print("✅ Column 'password_changed_at' already exists. Nothing to do.")
        else:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN password_changed_at VARCHAR(50)"
            ))
            print("✅ Added 'password_changed_at' column to users table.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
