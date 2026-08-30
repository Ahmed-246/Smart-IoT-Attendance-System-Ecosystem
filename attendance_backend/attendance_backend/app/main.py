import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
from contextlib import asynccontextmanager

from app.api import api_router
from app.db.database import init_db
from app.core.config import get_settings
from app.core.security import hash_password
from app.core.cleanup import cleanup_old_sessions, cleanup_expired_capabilities

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_db()
        await seed_admin()
        await seed_demo_data()
    except Exception as e:
        print(f"[ERROR] Startup failed: {e}")

    # Start background cleanup tasks
    session_cleanup_task = asyncio.create_task(cleanup_old_sessions())
    capability_cleanup_task = asyncio.create_task(cleanup_expired_capabilities())

    yield

    # Shutdown
    session_cleanup_task.cancel()
    capability_cleanup_task.cancel()
    try:
        await asyncio.gather(session_cleanup_task, capability_cleanup_task, return_exceptions=True)
    except asyncio.CancelledError:
        pass


async def seed_admin():
    """Create default Admin and Super Admin users and ensure credentials are up to date."""
    from app.db.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        # 1. Provision Super Admin
        result = await db.execute(select(User).where(User.email == settings.SUPER_ADMIN_EMAIL))
        super_admin = result.scalar_one_or_none()
        
        if not super_admin:
            super_admin = User(
                email=settings.SUPER_ADMIN_EMAIL,
                password_hash=hash_password(settings.SUPER_ADMIN_PASSWORD),
                role=UserRole.super_admin,
            )
            db.add(super_admin)
            print(f"[SEED] Super Admin created: {settings.SUPER_ADMIN_EMAIL}")
        else:
            # Force update password and role to ensure consistency
            super_admin.password_hash = hash_password(settings.SUPER_ADMIN_PASSWORD)
            super_admin.role = UserRole.super_admin
            print(f"[SEED] Super Admin credentials updated: {settings.SUPER_ADMIN_EMAIL}")

        # 2. Provision Standard Admin (Standard secondary account)
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.admin,
            )
            db.add(admin)
            print(f"[SEED] Standard Admin created: {settings.ADMIN_EMAIL}")
        else:
            # Force update password and role to ensure consistency
            admin.password_hash = hash_password(settings.ADMIN_PASSWORD)
            admin.role = UserRole.admin
            print(f"[SEED] Standard Admin credentials/role updated: {settings.ADMIN_EMAIL}")

        # 3. Provision System Config (Singleton id=1)
        from app.models.term_config import TermConfig
        result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
        config = result.scalar_one_or_none()
        if not config:
            db.add(TermConfig(id=1, system_logo_url="/logo.jpg"))
            print("[SEED] Default system configuration initialized.")

        await db.commit()


async def seed_demo_data():
    """Seed comprehensive multi-faculty reliable demo data."""
    from app.db.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.models.student import Student, ApprovalStatus
    from app.models.instructor import Instructor
    from app.models.doctor import Doctor
    from app.models.faculty import Faculty
    from app.models.department import Department
    from app.models.course import Course
    from app.models.enrollment import Enrollment
    from app.models.assessment import Assessment
    from app.models.grade_result import GradeResult
    from app.models.session import Session
    from app.models.attendance import Attendance, AttendanceStatus
    from app.models.academic_record import AcademicRecord
    from sqlalchemy import select, func
    import random
    import secrets
    import json
    from datetime import datetime, timedelta, timezone

    async def gen_phone():
        return f"010{random.randint(10000000, 99999999)}"

    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count(Faculty.id)))).scalar() or 0
        if count > 0: return

        print("[SEED] Seeding Comprehensive Ecosystem (Multi-Faculty, 100+ Students)...")

        # 1. FACULTIES & DEPARTMENTS
        faculties_data = [
            {"name": "Faculty of Engineering", "years": 5, "depts": ["Computer Systems", "Mechatronics"]},
            {"name": "Faculty of Medicine", "years": 6, "depts": ["General Medicine", "Surgery"]},
            {"name": "Faculty of Business", "years": 4, "depts": ["Business Administration", "Accounting"]}
        ]
        
        faculties = []
        departments = []
        for fd in faculties_data:
            fac = Faculty(name=fd['name'], description=f"{fd['years']} Year Program", total_years=fd['years'], semesters_per_year=2)
            db.add(fac)
            await db.flush()
            faculties.append(fac)
            for d_name in fd['depts']:
                dept = Department(name=d_name, faculty_id=fac.id)
                db.add(dept)
                await db.flush()
                departments.append(dept)

        # 2. DOCTORS & INSTRUCTORS
        staff_roles = [
            ("Dr. Ahmed Taha", "dr.ahmed@system.edu", "Dr.", Doctor),
            ("Prof. Mona Zaki", "prof.mona@system.edu", "Prof.", Doctor),
            ("Eng. Omar Ali", "eng.omar@system.edu", "Eng.", Instructor),
            ("TA Sara Samy", "ta.sara@system.edu", "TA", Instructor)
        ]
        doctors = []
        instructors = []
        for name, email, title, ModelClass in staff_roles:
            user = User(name=name, email=email, password_hash=hash_password("Pass@1234"), role=UserRole.engineer if ModelClass == Instructor else UserRole.doctor, phone_number=await gen_phone())
            db.add(user)
            profile = ModelClass(name=name, email=email, title=title, phone_number=await gen_phone())
            profile.faculties.extend(faculties)
            db.add(profile)
            if ModelClass == Doctor: doctors.append(profile)
            else: instructors.append(profile)
        await db.flush()

        # 3. COURSES & ASSESSMENTS
        courses = []
        now = datetime.now() # Naive datetime for DB compatibility
        
        def get_bp(has_prac):
            if has_prac:
                return json.dumps([
                    {"title": "Quiz 1", "assessment_type": "Quiz", "weight_pct": 10, "template_key": "quiz_1", "enabled": True},
                    {"title": "Midterm Exam", "assessment_type": "Midterm", "weight_pct": 20, "template_key": "midterm", "enabled": True},
                    {"title": "Practical Exam", "assessment_type": "Practical", "weight_pct": 20, "template_key": "practical", "enabled": True},
                    {"title": "Final Exam", "assessment_type": "Final", "weight_pct": 50, "template_key": "final", "enabled": True},
                ])
            else:
                return json.dumps([
                    {"title": "Quiz 1", "assessment_type": "Quiz", "weight_pct": 15, "template_key": "quiz_1", "enabled": True},
                    {"title": "Midterm Exam", "assessment_type": "Midterm", "weight_pct": 25, "template_key": "midterm", "enabled": True},
                    {"title": "Final Exam", "assessment_type": "Final", "weight_pct": 60, "template_key": "final", "enabled": True},
                ])

        for dept in departments:
            faculty = next(f for f in faculties if f.id == dept.faculty_id)
            for year in range(1, faculty.total_years + 1):
                has_prac = (year % 2 == 0)
                course = Course(
                    name=f"{dept.name} Core Y{year}", course_code=f"{dept.name[:3].upper()}{year}0{random.randint(1,9)}", 
                    department_id=dept.id, academic_year=year, semester=1, credits=3.0, passing_score=60.0, tier_level=1,
                    doctor_id=random.choice(doctors).id, instructor_id=random.choice(instructors).id,
                    assessment_blueprint=get_bp(has_prac), has_practical=has_prac
                )
                db.add(course)
                await db.flush()
                courses.append(course)

                # Assessments (Finished / Pending)
                q1 = Assessment(title="Quiz 1", assessment_type="Quiz", course_code=course.id, status="Finished", max_score=10 if has_prac else 15, weight_pct=10 if has_prac else 15, template_key="quiz_1", scheduled_date=now-timedelta(days=40), instructor_id=course.instructor_id, academic_year=year)
                mid = Assessment(title="Midterm Exam", assessment_type="Midterm", course_code=course.id, status="Finished", max_score=20 if has_prac else 25, weight_pct=20 if has_prac else 25, template_key="midterm", scheduled_date=now-timedelta(days=20), instructor_id=course.instructor_id, academic_year=year)
                fin = Assessment(title="Final Exam", assessment_type="Final", course_code=course.id, status="Pending", max_score=50 if has_prac else 60, weight_pct=50 if has_prac else 60, template_key="final", scheduled_date=now+timedelta(days=30), instructor_id=course.instructor_id, academic_year=year)
                
                db.add_all([q1, mid, fin])
                if has_prac:
                    prac = Assessment(title="Practical Exam", assessment_type="Practical", course_code=course.id, status="Pending", max_score=20, weight_pct=20, template_key="practical", scheduled_date=now+timedelta(days=15), instructor_id=course.instructor_id, academic_year=year)
                    db.add(prac)

        await db.flush()

        # 4. STUDENTS (100+)
        all_students = []
        for i in range(1, 101):
            dept = random.choice(departments)
            faculty = next(f for f in faculties if f.id == dept.faculty_id)
            year = random.randint(1, faculty.total_years)
            sname = f"Student {i}"
            semail = f"student{i}@university.edu"
            phone = await gen_phone()
            
            user = User(name=sname, email=semail, password_hash=hash_password("Pass@1234"), role=UserRole.student, phone_number=phone)
            db.add(user)
            student = Student(
                name=sname, email=semail, rfid_uid=secrets.token_hex(4).upper(), phone_number=phone,
                university_id=f"2026{i:03d}", department_id=dept.id, academic_year=year,
                approval_status=ApprovalStatus.APPROVED, approved_at=now, is_auto_approved=True
            )
            db.add(student)
            await db.flush()
            all_students.append(student)

        await db.flush()

        # 5. ENROLLMENTS & GRADES
        for student in all_students:
            active_courses = [c for c in courses if c.department_id == student.department_id and c.academic_year == student.academic_year]
            for c in active_courses:
                db.add(Enrollment(student_id=student.id, course_id=c.id, status="ACTIVE", academic_year_snapshot=student.academic_year))
                
                q1 = (await db.execute(select(Assessment).where(Assessment.course_code == c.id, Assessment.template_key == 'quiz_1'))).scalar_one()
                mid = (await db.execute(select(Assessment).where(Assessment.course_code == c.id, Assessment.template_key == 'midterm'))).scalar_one()
                
                db.add(GradeResult(assessment_id=q1.id, student_id=student.id, raw_score=random.uniform(q1.max_score * 0.6, q1.max_score)))
                db.add(GradeResult(assessment_id=mid.id, student_id=student.id, raw_score=random.uniform(mid.max_score * 0.6, mid.max_score)))

        await db.commit()
        print("[SEED] Massive Ecosystem Seeded Successfully.")



app = FastAPI(
    title="Smart IoT Attendance System API",
    description="Backend API for RFID-based attendance tracking with AI chatbot",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — tighten origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Global Exception on {request.url.path}: {exc}")
    import traceback
    traceback.print_exc()
    
    # Manually add CORS headers to the error response
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


# Request Logger Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"[DEBUG] Incoming: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[DEBUG] Outgoing: {request.method} {request.url.path} -> {response.status_code}")
    return response


# Health check
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "2.0.0"}


# Mount all routes with and without /api prefix for compatibility
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

@app.get("/seed")
async def manual_seed():
    """Manually trigger demo data seed."""
    try:
        await seed_demo_data()
        return {"message": "Database seeded successfully!"}
    except Exception as e:
        return {"error": str(e)}
