import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal as SessionLocal

async def fix_db():
    async with SessionLocal() as db:
        print("Checking for instructor_id column in assessments table...")
        # 1. Add column if missing
        try:
            await db.execute(text("ALTER TABLE assessments ADD COLUMN instructor_id INTEGER"))
            await db.commit()
            print("✅ Added instructor_id column to assessments table.")
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️ instructor_id column already exists.")
            else:
                print(f"❌ Error adding column: {e}")
        
        # 2. Add foreign key if missing
        try:
            await db.execute(text("ALTER TABLE assessments ADD CONSTRAINT fk_assessment_instructor FOREIGN KEY (instructor_id) REFERENCES instructors(id)"))
            await db.commit()
            print("✅ Added foreign key constraint.")
        except Exception as e:
            print(f"ℹ️ Constraint info: {e}")

        # 3. Backfill
        print("Backfilling instructors...")
        sql = """
            UPDATE assessments
            SET instructor_id = (
                SELECT instructor_id FROM courses 
                WHERE courses.id = assessments.course_code
            )
            WHERE instructor_id IS NULL
        """
        await db.execute(text(sql))
        await db.commit()
        print("✅ Successfully backfilled assessments.")

if __name__ == "__main__":
    asyncio.run(fix_db())
