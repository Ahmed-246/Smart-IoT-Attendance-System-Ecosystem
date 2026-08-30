import asyncio
import sys
import os
import requests

# Add root to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from app.db.database import AsyncSessionLocal as SessionLocal
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.doctor import Doctor
from app.models.faculty import Faculty
from app.models.department import Department
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.grade import Grade, GradeType
from app.models.session import Session
from app.models.attendance import Attendance
from app.models.device import Device
from app.models.assessment import Assessment, AssessmentType
from app.models.grade_result import GradeResult
from app.models.academic_record import AcademicRecord
from app.models.term_config import TermConfig

async def verify():
    print("🔍 Starting RBAC Verification...")
    
    async with SessionLocal() as db:
        # 1. Verify Super Admin exists and has the correct role
        result = await db.execute(select(User).where(User.email == "superadmin@iot.com"))
        super_admin = result.scalar_one_or_none()
        
        if super_admin and super_admin.role == UserRole.super_admin:
            print("✅ Super Admin account verified.")
        else:
            print(f"❌ Super Admin verification failed. Found: {super_admin.role if super_admin else 'Nothing'}")

        # 2. Check for regular admins
        result = await db.execute(select(User).where(User.role == UserRole.admin))
        admins = result.scalars().all()
        print(f"ℹ️ Found {len(admins)} regular admin(s).")

    # 3. Test API protection (Local test if server is running)
    print("\n📡 Testing API endpoints (requires local server at 127.0.0.1:8000)...")
    base_url = "http://127.0.0.1:8000"
    
    try:
        # Try to login as superadmin
        login_res = requests.post(f"{base_url}/auth/login", json={
            "email": "superadmin@iot.com",
            "password": "Admin@1234"
        })
        
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Super Admin login successful.")
            
            # Test a restricted endpoint (batch promotion - using year 999 to not affect real data)
            promo_res = requests.post(f"{base_url}/academic/process-promotion", params={"academic_year": 999}, headers=headers)
            print(f"ℹ️ Super Admin /process-promotion: {promo_res.status_code} ({promo_res.json().get('message', 'No message')})")
            
            if promo_res.status_code in [200, 404]: # 404 might mean year not found but 403 would mean unauthorized
                print("✅ Access allowed for Super Admin.")
            else:
                print(f"❌ Unexpected status code: {promo_res.status_code}")
        else:
            print(f"❌ Super Admin login failed: {login_res.text}")

    except Exception as e:
        print(f"ℹ️ Skipping live API tests: {e}")

    print("\n✨ Verification Completed.")

if __name__ == "__main__":
    asyncio.run(verify())
