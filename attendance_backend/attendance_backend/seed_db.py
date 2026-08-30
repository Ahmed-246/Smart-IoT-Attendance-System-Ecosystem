import asyncio
import json
import random
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, text
from app.db.database import AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.models.student import Student, ApprovalStatus
from app.models.pre_verified import PreVerifiedStudent
from app.models.instructor import Instructor
from app.models.doctor import Doctor
from app.models.faculty import Faculty
from app.models.department import Department
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.grade_result import GradeResult
from app.models.session import Session as AttendanceSession
from app.models.attendance import Attendance, AttendanceStatus
from app.core.security import hash_password

def generate_phone():
    return f"010{random.randint(10000000, 99999999)}"

async def seed_v2():
    await init_db()
    async with AsyncSessionLocal() as db:
        print("[SEED V2] Initiating Super Reset V2...")
        
        # Guard clause
        count = (await db.execute(select(func.count(Faculty.id)))).scalar() or 0
        if count > 0:
            print("[SEED V2] Database is not empty. Please run reset_db.py first!")
            return

        print("[SEED V2] 1. Creating Admin & System Users...")
        # Super Admin
        super_admin = User(
            name="System Administrator",
            email="admin@school.edu",
            password_hash=hash_password("admin123"),
            role=UserRole.super_admin,
            phone_number=generate_phone()
        )
        db.add(super_admin)
        await db.flush()

        print("[SEED V2] 2. Creating Faculties & Departments...")
        faculties_data = [
            {"name": "Faculty of Engineering", "years": 5, "depts": ["Computer Systems Engineering", "Mechanical Engineering"]},
            {"name": "Faculty of Medicine", "years": 6, "depts": ["General Medicine", "Surgery"]},
            {"name": "Faculty of Business", "years": 4, "depts": ["Business Administration", "Accounting"]},
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

        print("[SEED V2] 3. Creating Instructors & Doctors...")
        staff_roles = [
            ("Dr. Ahmed Taha", "dr.ahmed@school.edu", "Dr.", Doctor),
            ("Prof. Mona Zaki", "prof.mona@school.edu", "Prof.", Doctor),
            ("Eng. Omar Ali", "eng.omar@school.edu", "Eng.", Instructor),
            ("TA Sara Samy", "sara@school.edu", "TA", Instructor)
        ]
        doctors = []
        instructors = []
        
        for name, email, title, ModelClass in staff_roles:
            phone = generate_phone()
            # Map roles correctly to the enum
            role = UserRole.doctor if ModelClass == Doctor else UserRole.engineer
            user = User(name=name, email=email, password_hash=hash_password("Pass123!"), role=role, phone_number=phone)
            db.add(user)
            profile = ModelClass(name=name, email=email, title=title, phone_number=phone)
            profile.faculties.extend(faculties)
            profile.departments.extend(departments)
            db.add(profile)
            if ModelClass == Doctor: doctors.append(profile)
            else: instructors.append(profile)
        await db.flush()

        print("[SEED V2] 4. Creating Multi-Level Courses...")
        courses = []
        def get_bp(has_practical=True):
            if has_practical:
                return json.dumps([
                    {"title": "Quiz 1", "assessment_type": "Quiz", "weight_pct": 10, "template_key": "quiz_1", "enabled": True},
                    {"title": "Midterm Exam", "assessment_type": "Midterm", "weight_pct": 20, "template_key": "midterm", "enabled": True},
                    {"title": "Quiz 2", "assessment_type": "Quiz", "weight_pct": 10, "template_key": "quiz_2", "enabled": True},
                    {"title": "Practical Exam", "assessment_type": "Practical", "weight_pct": 20, "template_key": "practical", "enabled": True},
                    {"title": "Final Exam", "assessment_type": "Final", "weight_pct": 40, "template_key": "final", "enabled": True},
                ])
            else:
                return json.dumps([
                    {"title": "Quiz 1", "assessment_type": "Quiz", "weight_pct": 10, "template_key": "quiz_1", "enabled": True},
                    {"title": "Midterm Exam", "assessment_type": "Midterm", "weight_pct": 20, "template_key": "midterm", "enabled": True},
                    {"title": "Quiz 2", "assessment_type": "Quiz", "weight_pct": 10, "template_key": "quiz_2", "enabled": True},
                    {"title": "Final Exam", "assessment_type": "Final", "weight_pct": 60, "template_key": "final", "enabled": True},
                ])

        for dept in departments:
            # Faculty programs vary in length
            faculty = next(f for f in faculties if f.id == dept.faculty_id)
            for year in range(1, faculty.total_years + 1):
                has_prac = (year % 2 == 0) # Alternate practicals for variety
                course = Course(
                    name=f"{dept.name} - Year {year}", course_code=f"{dept.name[:2].upper()}{year}0{random.randint(1,9)}", 
                    department_id=dept.id, academic_year=year, semester=1, credits=3.0, passing_score=60.0, tier_level=1,
                    doctor_id=random.choice(doctors).id, instructor_id=random.choice(instructors).id,
                    assessment_blueprint=get_bp(has_prac), has_practical=has_prac
                )
                db.add(course)
                await db.flush()
                courses.append(course)

                # Assessments (Current Term)
                now = datetime.now(timezone.utc)
                db.add(Assessment(title="Quiz 1", assessment_type="Quiz", course_code=course.id, status="Finished", max_score=10, weight_pct=10, template_key="quiz_1", scheduled_date=now-timedelta(days=40), instructor_id=course.instructor_id, academic_year=year))
                db.add(Assessment(title="Midterm Exam", assessment_type="Midterm", course_code=course.id, status="Finished", max_score=20, weight_pct=20, template_key="midterm", scheduled_date=now-timedelta(days=20), instructor_id=course.instructor_id, academic_year=year))
                
                # Quiz 2 is usually the bottleneck for transition
                db.add(Assessment(title="Quiz 2", assessment_type="Quiz", course_code=course.id, status="Pending", max_score=10, weight_pct=10, template_key="quiz_2", scheduled_date=now+timedelta(days=10), instructor_id=course.instructor_id, academic_year=year))
                
                if has_prac:
                    db.add(Assessment(title="Practical Exam", assessment_type="Practical", course_code=course.id, status="Pending", max_score=20, weight_pct=20, template_key="practical", scheduled_date=now+timedelta(days=15), instructor_id=course.instructor_id, academic_year=year))
                
                db.add(Assessment(title="Final Exam", assessment_type="Final", course_code=course.id, status="Pending", max_score=40 if has_prac else 60, weight_pct=40 if has_prac else 60, template_key="final", scheduled_date=now+timedelta(days=30), instructor_id=course.instructor_id, academic_year=year))

        await db.flush()

        print("[SEED V2] 5. Creating Massive Student Population (100+ Students)...")
        from app.models.academic_record import AcademicRecord
        all_students = []
        for i in range(1, 121):
            dept = random.choice(departments)
            faculty = next(f for f in faculties if f.id == dept.faculty_id)
            year = random.randint(1, faculty.total_years)
            sname = f"Test Student {i}"
            semail = f"student{i}@university.edu"
            
            user = User(name=sname, email=semail, password_hash=hash_password("Pass123!"), role=UserRole.student)
            db.add(user)
            student = Student(
                name=sname, email=semail, rfid_uid=secrets.token_hex(4).upper(),
                university_id=f"2026{i:03d}", department_id=dept.id, academic_year=year,
                approval_status=ApprovalStatus.APPROVED
            )
            db.add(student)
            await db.flush()
            all_students.append(student)

            # ARCHIVE LOGIC: If student is Year 2+, seed previous years
            if year > 1:
                for prev_yr in range(1, year):
                    record = AcademicRecord(
                        student_id=student.id, academic_year=prev_yr, semester=1,
                        year_level=prev_yr, academic_year_label=f"202{prev_yr+3}/202{prev_yr+4}",
                        weighted_average=random.uniform(70.0, 95.0), total_credits=18.0, failed_courses=0,
                        status_at_time="PROMOTED", result_type="PROMOTED"
                    )
                    db.add(record)

        await db.flush()

        print("[SEED V2] 6. Building Enrollment Grids & Intentional Audit Gaps...")
        for student in all_students:
            # Current semester enrollment
            active_courses = [c for c in courses if c.department_id == student.department_id and c.academic_year == student.academic_year]
            for c in active_courses:
                db.add(Enrollment(student_id=student.id, course_id=c.id))
                
                # Mock Grades for Finished items
                q1 = (await db.execute(select(Assessment).where(Assessment.course_code == c.id, Assessment.template_key == 'quiz_1'))).scalar_one()
                mid = (await db.execute(select(Assessment).where(Assessment.course_code == c.id, Assessment.template_key == 'midterm'))).scalar_one()
                
                # Inject a few intentional grade gaps for audit testing (e.g. Student 22 and 29 miss Q1)
                if not (student.id in [22, 29] and c.id % 2 == 0):
                    db.add(GradeResult(assessment_id=q1.id, student_id=student.id, raw_score=random.uniform(7.0, 10.0)))
                
                db.add(GradeResult(assessment_id=mid.id, student_id=student.id, raw_score=random.uniform(14.0, 20.0)))

        # 7. Finalize and Commit
        await db.commit()
        print("[SEED V2] Massive Real-Fake Ecosystem deployed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_v2())
