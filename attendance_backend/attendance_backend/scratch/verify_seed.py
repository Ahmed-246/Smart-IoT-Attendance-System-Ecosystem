import asyncio
from app.db.database import AsyncSessionLocal
from app.models.course import Course
from app.models.assessment import Assessment
from app.models.student import Student
from app.models.doctor import Doctor
from app.models.instructor import Instructor
from app.models.faculty import Faculty
from app.models.department import Department
from app.models.enrollment import Enrollment
from app.models.grade_result import GradeResult
from app.models.academic_record import AcademicRecord
from app.models.session import Session
from app.models.attendance import Attendance
from app.models.grade import Grade
from sqlalchemy import select

async def verify():
    async with AsyncSessionLocal() as db:
        # Check Courses
        res = await db.execute(select(Course).limit(1))
        course = res.scalar_one_or_none()
        if course:
            print(f"Course Found: {course.name}")
            print(f"Blueprint: {course.assessment_blueprint[:100]}...")
            print(f"Has Practical: {course.has_practical}")
            
            # Check Assessments for this course
            ares = await db.execute(select(Assessment).where(Assessment.course_code == course.id))
            assessments = ares.scalars().all()
            print(f"Assessments created: {len(assessments)}")
            for a in assessments:
                print(f" - {a.title} ({a.template_key}) Status: {a.status}")

        # Check Students
        sres = await db.execute(select(Student).limit(1))
        student = sres.scalar_one_or_none()
        if student:
            print(f"Student Found: {student.name}")

if __name__ == "__main__":
    asyncio.run(verify())
