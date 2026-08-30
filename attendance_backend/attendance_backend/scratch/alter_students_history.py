import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import get_settings

async def alter_db():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE students ADD COLUMN auto_approve_history_cleared BOOLEAN DEFAULT FALSE"))
            print("Added auto_approve_history_cleared to students")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    from sqlalchemy import text
    asyncio.run(alter_db())
