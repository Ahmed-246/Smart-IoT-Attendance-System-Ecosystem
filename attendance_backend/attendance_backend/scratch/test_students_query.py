import asyncio
from app.db.database import engine
from sqlalchemy import select

# CRITICAL: Import all models to ensure mappers are initialized correctly
from app.models import student, user, faculty, department, doctor, instructor, course, enrollment, associations

async def test_query():
    async with engine.connect() as conn:
        print("[TEST] Querying students table...")
        # Use student.Student because we imported the module
        query = select(student.Student).where(
            student.Student.approval_status == student.ApprovalStatus.APPROVED,
            student.Student.academic_status != student.AcademicStatus.GRADUATED
        )
        try:
            result = await conn.execute(query)
            students_list = result.fetchall()
            print(f"[SUCCESS] Found {len(students_list)} approved students.")
            for s in students_list[:3]:
                print(f" - {s.name} ({s.university_id})")
        except Exception as e:
            print(f"[FAILED] Query failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_query())
