import asyncio
import sys
import os

# Add root to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from app.db.database import AsyncSessionLocal as SessionLocal
from app.models import (
    user, student, instructor, doctor, faculty, department, 
    course, enrollment, grade, session, attendance, device, associations,
    assessment, grade_result, academic_record, term_config
)
from app.models.user import User, UserRole
from app.core.security import hash_password

async def init_super_admin():
    email = "superadmin@iot.com"
    password = "super123"
    
    print(f"🔑 Initializing Super Admin: {email}...")
    
    async with SessionLocal() as db:
        # Check if exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"ℹ️ Super Admin already exists. Updating role to {UserRole.super_admin.value}...")
            user.role = UserRole.super_admin
            # Optional: Reset password if requested by uncommenting line below
            # user.password_hash = hash_password(password)
        else:
            print("🆕 Creating new Super Admin account...")
            user = User(
                email=email,
                password_hash=hash_password(password),
                role=UserRole.super_admin
            )
            db.add(user)
        
        await db.commit()
        print(f"✅ Super Admin system initialized successfully.")

if __name__ == "__main__":
    asyncio.run(init_super_admin())
