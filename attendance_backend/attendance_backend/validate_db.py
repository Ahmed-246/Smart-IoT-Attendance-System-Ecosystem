
import asyncio
from app.db.database import AsyncSessionLocal
from app.models.student import Student
from app.models.course import Course
from app.models.assessment import Assessment
from app.models.grade_result import GradeResult
from app.models.enrollment import Enrollment
from sqlalchemy import select

async def validate():
    async with AsyncSessionLocal() as db:
        print("Checking for data integrity issues...")
        
        # Check Assessments for null weights
        res = await db.execute(select(Assessment).where((Assessment.weight_pct == None) | (Assessment.max_score == None)))
        bad_assessments = res.scalars().all()
        if bad_assessments:
            print(f"Found {len(bad_assessments)} assessments with null weight or max_score:")
            for a in bad_assessments:
                print(f"  ID: {a.id}, Title: {a.title}, Course: {a.course_code}")
        else:
            print("Assessments OK.")

        # Check Courses for null credits or passing score
        res = await db.execute(select(Course).where((Course.credits == None) | (Course.passing_score == None)))
        bad_courses = res.scalars().all()
        if bad_courses:
            print(f"Found {len(bad_courses)} courses with null credits or passing_score:")
            for c in bad_courses:
                print(f"  ID: {c.id}, Name: {c.name}")
        else:
            print("Courses OK.")
            
        # Check GradeResults for null raw_score
        res = await db.execute(select(GradeResult).where(GradeResult.raw_score == None))
        bad_grades = res.scalars().all()
        if bad_grades:
            print(f"Found {len(bad_grades)} grade results with null raw_score.")
        else:
            print("Grades OK.")

if __name__ == "__main__":
    asyncio.run(validate())
