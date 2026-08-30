import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import get_settings

async def alter_db():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE pre_verified_students ADD COLUMN created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))
            print("Added created_by_id to pre_verified_students")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    from sqlalchemy import text
    asyncio.run(alter_db())
