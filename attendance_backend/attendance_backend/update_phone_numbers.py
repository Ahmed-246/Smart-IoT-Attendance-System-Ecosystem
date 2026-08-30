import asyncio
import random
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
# Import all models to ensure mappers are initialized
from app.models import (
    user, student, instructor, doctor, faculty, department, 
    course, enrollment, grade, session, attendance, device, associations,
    assessment, grade_result, academic_record, term_config
)
from app.models.user import User
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.doctor import Doctor

def generate_eg_phone():
    prefix = random.choice(["010", "011", "012", "015"])
    rest = "".join([str(random.randint(0, 9)) for _ in range(8)])
    return f"{prefix}{rest}"

async def seed_phones():
    async with AsyncSessionLocal() as db:
        print("[SEED] Starting phone number enrichment...")

        # Update Users
        print("[SEED] Updating User table (Admins/Other)...")
        users = (await db.execute(select(User))).scalars().all()
        for u in users:
            if not u.phone_number:
                u.phone_number = generate_eg_phone()
            else:
                u.phone_number = u.phone_number.replace(" ", "").replace("-", "")
        
        # Update Students
        print("[SEED] Updating Student table...")
        students = (await db.execute(select(Student))).scalars().all()
        for s in students:
            if not s.phone_number:
                s.phone_number = generate_eg_phone()
            else:
                s.phone_number = s.phone_number.replace(" ", "").replace("-", "")

        # Update Instructors
        print("[SEED] Updating Instructor table...")
        instructors = (await db.execute(select(Instructor))).scalars().all()
        for i in instructors:
            if not i.phone_number:
                i.phone_number = generate_eg_phone()
            else:
                i.phone_number = i.phone_number.replace(" ", "").replace("-", "")

        # Update Doctors
        print("[SEED] Updating Doctor table...")
        doctors = (await db.execute(select(Doctor))).scalars().all()
        for d in doctors:
            if not d.phone_number:
                d.phone_number = generate_eg_phone()
            else:
                d.phone_number = d.phone_number.replace(" ", "").replace("-", "")

        await db.commit()
        print("[SEED] Phone number enrichment complete.")

if __name__ == "__main__":
    asyncio.run(seed_phones())
