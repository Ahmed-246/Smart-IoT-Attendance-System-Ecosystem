import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/attendance_db"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_password_hash VARCHAR(255)")
        )
        print("✅ Column 'academic_password_hash' added to users table successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
