import asyncio
import os
import sys

# Setup path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.db.database import AsyncSessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.doctor import Doctor
from app.models.instructor import Instructor
from app.models.course import Course
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.enrollment import Enrollment
from app.models.attendance import Attendance
from app.models.session import Session
from app.models.grade import Grade
from app.models.device import Device
from app.models.assessment import Assessment
from app.models.grade_result import GradeResult
from app.models.activity import SystemActivity
from app.models.academic_record import AcademicRecord
from app.models.term_config import TermConfig
from app.models.pre_verified import PreVerifiedStudent
from app.models.verification import VerificationToken

async def fix_sync():
    print("--- DEEP IDENTITY SYNC REPAIR STARTING ---")
    async with AsyncSessionLocal() as db:
        # 1. Sync Students -> Users
        print("\n[1/4] Syncing Students -> Users...")
        students = (await db.execute(select(Student))).scalars().all()
        for student in students:
            res = await db.execute(select(User).where(User.email == student.email))
            user = res.scalar_one_or_none()
            if user:
                changed = False
                if user.name != student.name:
                    print(f"  Fixing name for {user.email}: '{user.name}' -> '{student.name}'")
                    user.name = student.name
                    changed = True
                if user.phone_number != student.phone_number:
                    print(f"  Fixing phone for {user.email}: '{user.phone_number}' -> '{student.phone_number}'")
                    user.phone_number = student.phone_number
                    changed = True
                if changed:
                    await db.flush()

        # 2. Sync Doctors -> Users
        print("\n[2/4] Syncing Doctors -> Users...")
        doctors = (await db.execute(select(Doctor))).scalars().all()
        for doctor in doctors:
            res = await db.execute(select(User).where(User.email == doctor.email))
            user = res.scalar_one_or_none()
            if user:
                changed = False
                if user.name != doctor.name:
                    print(f"  Fixing name for {user.email}: '{user.name}' -> '{doctor.name}'")
                    user.name = doctor.name
                    changed = True
                if user.phone_number != doctor.phone_number:
                    print(f"  Fixing phone for {user.email}: '{user.phone_number}' -> '{doctor.phone_number}'")
                    user.phone_number = doctor.phone_number
                    changed = True
                if changed:
                    await db.flush()

        # 3. Sync Instructors (Engineers) -> Users
        print("\n[3/4] Syncing Instructors -> Users...")
        instructors = (await db.execute(select(Instructor))).scalars().all()
        for inst in instructors:
            res = await db.execute(select(User).where(User.email == inst.email))
            user = res.scalar_one_or_none()
            if user:
                changed = False
                if user.name != inst.name:
                    print(f"  Fixing name for {user.email}: '{user.name}' -> '{inst.name}'")
                    user.name = inst.name
                    changed = True
                if user.phone_number != inst.phone_number:
                    print(f"  Fixing phone for {user.email}: '{user.phone_number}' -> '{inst.phone_number}'")
                    user.phone_number = inst.phone_number
                    changed = True
                if changed:
                    await db.flush()
        
        # 4. Check for Orphaned Users (Role set but no Profile)
        print("\n[4/4] Checking for Orphaned Users (Identity Check)...")
        users = (await db.execute(select(User))).scalars().all()
        for user in users:
            if user.role == UserRole.student:
                res = await db.execute(select(Student).where(Student.email == user.email))
                if not res.scalar_one_or_none():
                    print(f"  WARNING: Student User '{user.email}' has no profile record!")
            elif user.role == UserRole.doctor:
                res = await db.execute(select(Doctor).where(Doctor.email == user.email))
                if not res.scalar_one_or_none():
                    print(f"  WARNING: Doctor User '{user.email}' has no profile record!")
            elif user.role == UserRole.engineer:
                res = await db.execute(select(Instructor).where(Instructor.email == user.email))
                if not res.scalar_one_or_none():
                    print(f"  WARNING: Engineer User '{user.email}' has no profile record!")

        await db.commit()
        print("\n--- SYNC REPAIR COMPLETED SUCCESSFULLY ---")

if __name__ == "__main__":
    asyncio.run(fix_sync())
