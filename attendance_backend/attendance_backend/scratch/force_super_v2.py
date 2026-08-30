import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.database import AsyncSessionLocal
from app.models.user import User, UserRole
from sqlalchemy import select

# Import all models to avoid Mapper errors
import app.models.faculty
import app.models.instructor
import app.models.doctor
import app.models.student
import app.models.course
import app.models.enrollment
import app.models.assessment
import app.models.grade_result
import app.models.session
import app.models.attendance

async def force_superadmin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "superadmin@iot.com"))
        user = result.scalar_one_or_none()
        if user:
            print(f"Found user {user.email} with role {user.role}. Updating to super_admin...")
            user.role = UserRole.super_admin
            await db.commit()
            print("Successfully updated.")
        else:
            print("User not found.")

if __name__ == "__main__":
    asyncio.run(force_superadmin())
