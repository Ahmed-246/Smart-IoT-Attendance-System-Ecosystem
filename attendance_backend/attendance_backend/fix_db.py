import asyncio
from app.db.database import AsyncSessionLocal
from sqlalchemy import text

async def patch_db():
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(text("ALTER TABLE courses ADD COLUMN has_practical BOOLEAN DEFAULT FALSE NOT NULL;"))
            print("Successfully added has_practical to courses")
        except Exception as e:
            print(f"Error adding has_practical: {e}")
        
        try:
            await session.commit()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(patch_db())
