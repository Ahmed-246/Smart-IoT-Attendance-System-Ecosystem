import asyncio
import httpx
import sys
import os

# Add parent dir to sys.path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.doctor import Doctor
from app.models.faculty import Faculty
from app.models.department import Department
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.session import Session
from app.models.attendance import Attendance
from sqlalchemy import select

async def verify():
    # We will check the database directly to see if a phone_number can be saved.
    async for db in get_db():
        # 1. Pick a test user
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        
        if not user:
            print("No users found to test with.")
            return

        original_phone = user.phone_number
        test_phone = "01012345678"
        
        print(f"Testing on User: {user.email}")
        print(f"Original Phone: {original_phone}")
        
        # 2. Update via ORM (simulating the route logic)
        user.phone_number = test_phone
        await db.commit()
        await db.refresh(user)
        
        print(f"Updated Phone in DB: {user.phone_number}")
        
        if user.phone_number == test_phone:
            print("SUCCESS: Phone number persisted to DB.")
        else:
            print("FAILURE: Phone number did NOT persist.")
            
        # 3. Cleanup (optional, but good for test repeatability)
        user.phone_number = original_phone
        await db.commit()
        break

if __name__ == "__main__":
    asyncio.run(verify())
