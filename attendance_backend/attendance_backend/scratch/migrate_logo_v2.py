import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/attendance_db"

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Checking term_config table...")
        try:
            await conn.execute(text("ALTER TABLE term_config ADD COLUMN IF NOT EXISTS system_logo_url VARCHAR DEFAULT '/logo.jpg'"))
            print("Successfully added system_logo_url column to term_config table.")
        except Exception as e:
            print(f"Error during migration: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
