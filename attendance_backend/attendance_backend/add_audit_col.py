import asyncio
from sqlalchemy import text
from app.db.database import engine

async def add_cols():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE grade_results ADD COLUMN created_by_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL"))
            print("Added to grade_results")
        except Exception as e:
            print(e)
        try:
            await conn.execute(text("UPDATE grade_results SET is_flagged = FALSE WHERE is_flagged IS NULL"))
        except Exception as e:
            pass

if __name__ == "__main__":
    asyncio.run(add_cols())
