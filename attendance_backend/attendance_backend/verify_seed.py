import asyncio
from sqlalchemy import select, func
from app.db.database import AsyncSessionLocal, init_db
from app.models.course import Course
from app.models.assessment import Assessment
from app.models.academic_record import AcademicRecord
from app.models.student import Student

async def verify():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Count courses
        courses_count = (await db.execute(select(func.count(Course.id)))).scalar()
        print(f"Total Courses: {courses_count}")

        # Count students
        students_count = (await db.execute(select(func.count(Student.id)))).scalar()
        print(f"Total Students: {students_count}")

        # Count assessments
        assessments_count = (await db.execute(select(func.count(Assessment.id)))).scalar()
        print(f"Total Assessments: {assessments_count}")

        # Count archive records
        archive_count = (await db.execute(select(func.count(AcademicRecord.id)))).scalar()
        print(f"Total Archive Records: {archive_count}")

        # Check weight distribution
        result = await db.execute(select(Course).limit(5))
        for c in result.scalars().all():
            print(f"  Course: {c.name} | Practical: {c.has_practical} | Year: {c.academic_year}")
            
            ass_res = await db.execute(select(Assessment).where(Assessment.course_code == c.id))
            for a in ass_res.scalars().all():
                print(f"    {a.template_key}: {a.weight_pct}% (max_score={a.max_score}, status={a.status})")

asyncio.run(verify())
