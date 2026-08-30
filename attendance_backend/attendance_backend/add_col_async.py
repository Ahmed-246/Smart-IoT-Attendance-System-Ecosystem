import asyncio
from sqlalchemy import text
from app.db.database import engine

async def add_cols():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE courses ADD COLUMN academic_year INTEGER"))
            print("Added to courses")
        except Exception as e:
            print(e)
        try:
            await conn.execute(text("ALTER TABLE assessments ADD COLUMN academic_year INTEGER"))
            print("Added to assessments")
        except Exception as e:
            print(e)

if __name__ == "__main__":
    asyncio.run(add_cols())
