import asyncio
from sqlalchemy import select, delete
from app.db.database import engine
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.course import Course
from app.models import (  # Ensure all models are in registry
    user, student, instructor, doctor, faculty, department, 
    course, enrollment, grade, session, attendance, device, associations,
    assessment, grade_result, academic_record, term_config
)

async def cleanup():
    async with AsyncSession(engine) as session:
        # Find the course named 'test'
        res = await session.execute(select(Course).where(Course.name == 'test'))
        courses = res.scalars().all()
        
        if not courses:
            print("No course named 'test' found.")
            return

        for course in courses:
            print(f"Deleting course: {course.name} (ID: {course.id})")
            await session.delete(course)
        
        await session.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(cleanup())
