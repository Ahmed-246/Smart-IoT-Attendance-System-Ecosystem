
import asyncio
from app.db.database import AsyncSessionLocal
from app.models.student import Student
from app.models.session import Session
from app.models.attendance import Attendance
from app.models.enrollment import Enrollment
from app.models.course import Course
from sqlalchemy import select, func

async def debug_attendance():
    async with AsyncSessionLocal() as db:
        sid = 26
        # 1. Check student
        s = (await db.execute(select(Student).where(Student.id == sid))).scalar_one_or_none()
        if not s:
            print(f"Student {sid} not found.")
            return
        
        print(f"Student: {s.name} (ID: {sid})")
        
        # 2. Check Enrollments
        enrollments = (await db.execute(select(Enrollment, Course).join(Course).where(Enrollment.student_id == sid))).all()
        print(f"Enrolled in {len(enrollments)} courses.")
        
        course_ids = [e.Course.id for e in enrollments]
        
        # 3. Check Sessions for those courses
        sessions_res = await db.execute(select(func.count(Session.id)).where(Session.course_id.in_(course_ids)))
        total_sessions = sessions_res.scalar() or 0
        print(f"Total Sessions for these courses: {total_sessions}")
        
        # 4. Check Attendance records for student 26
        att_res = await db.execute(select(func.count(Attendance.id)).where(Attendance.student_id == sid))
        total_att = att_res.scalar() or 0
        print(f"Student 26 Attendance Records: {total_att}")

if __name__ == "__main__":
    asyncio.run(debug_attendance())
