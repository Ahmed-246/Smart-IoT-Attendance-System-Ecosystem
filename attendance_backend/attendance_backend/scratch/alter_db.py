import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import get_settings

async def alter_db():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE students ADD COLUMN is_auto_approved BOOLEAN DEFAULT FALSE NOT NULL"))
            print("Added is_auto_approved")
        except Exception as e:
            print("Error adding is_auto_approved:", e)
            
        try:
            await conn.execute(text("ALTER TABLE students ADD COLUMN admin_seen_auto_approve BOOLEAN DEFAULT FALSE NOT NULL"))
            print("Added admin_seen_auto_approve")
        except Exception as e:
            print("Error adding admin_seen_auto_approve:", e)

if __name__ == "__main__":
    from sqlalchemy import text
    asyncio.run(alter_db())
