import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal as SessionLocal

async def backfill_instructors():
    async with SessionLocal() as db:
        # Use raw SQL to avoid model loading issues
        sql = """
            UPDATE assessments
            SET instructor_id = (
                SELECT instructor_id FROM courses 
                WHERE courses.id = assessments.course_code
            )
            WHERE instructor_id IS NULL
        """
        result = await db.execute(text(sql))
        await db.commit()
        print(f"✅ Successfully backfilled assessments with course instructors.")

if __name__ == "__main__":
    asyncio.run(backfill_instructors())
