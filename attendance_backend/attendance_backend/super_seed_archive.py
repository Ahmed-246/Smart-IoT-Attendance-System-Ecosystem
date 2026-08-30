import asyncio
import json
import random
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, delete, text
from app.db.database import AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.models.student import Student, ApprovalStatus, AcademicStatus
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
from app.models.term_config import TermConfig
from app.core.security import hash_password

def generate_phone():
    return f"010{random.randint(10000000, 99999999)}"

async def super_seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        print("[DEEP SEED] Purging existing academic data for clean slate...")
        await db.execute(delete(Enrollment))
        await db.execute(delete(Attendance))
        await db.execute(delete(AttendanceSession))
        await db.execute(delete(GradeResult))
        await db.execute(delete(Assessment))
        await db.execute(delete(Course))
        await db.execute(delete(Student))
        await db.execute(delete(Doctor))
        await db.execute(delete(Instructor))
        await db.execute(delete(Department))
        await db.execute(delete(Faculty))
        await db.execute(delete(TermConfig))
        await db.execute(delete(User).where(User.role != UserRole.super_admin))
        await db.commit()

        print("[DEEP SEED] 1. Initializing Term Config to 2024/2025 Semester 2...")
        # Singleton handling for TermConfig
        await db.execute(text("DELETE FROM term_config WHERE id = 1"))
        term = TermConfig(id=1, academic_year_label="2024/2025", current_year_start=2024, current_semester=2)
        db.add(term)
        await db.flush()

        print("[DEEP SEED] 2. Re-creating Super Admin if missing...")
        root_query = await db.execute(select(User).where(User.email == "admin@school.edu"))
        if not root_query.scalar_one_or_none():
            root = User(
                name="Root Administrator", email="admin@school.edu",
                password_hash=hash_password("admin123"), role=UserRole.super_admin,
                phone_number="01000000000"
            )
            db.add(root)
            await db.flush()

        print("[DEEP SEED] 3. Building Multi-Faculty Hierarchy...")
        faculties_data = [
            {"name": "Faculty of Engineering", "years": 5, "depts": ["Mechatronics", "Architecture", "Computer Science"]},
            {"name": "Faculty of Medicine", "years": 6, "depts": ["General Medicine", "Pediatrics", "Cardiology"]},
            {"name": "Faculty of Business", "years": 4, "depts": ["Journalism", "Public Relations"]},
        ]
        
        faculties = []
        departments = []
        for fd in faculties_data:
            fac = Faculty(name=fd['name'], description=f"{fd['years']} Year Professional Program", total_years=fd['years'], semesters_per_year=2)
            db.add(fac)
            await db.flush()
            faculties.append(fac)
            for d_name in fd['depts']:
                dept = Department(name=d_name, faculty_id=fac.id)
                db.add(dept)
                await db.flush()
                departments.append(dept)

        print("[DEEP SEED] 4. Creating 'Real Fake' Staff Profiles...")
        staff_names = [
            ("Dr. Ahmed Mansour", "ahmed.mansour@school.edu", "Professor"),
            ("Dr. Sarah Hassan", "sarah.hassan@school.edu", "Lecturer"),
            ("Prof. Khaled Ali", "khaled.ali@school.edu", "Senior Professor"),
            ("Dr. Mona Zaki", "mona.zaki@school.edu", "Assistant Professor"),
            ("Eng. Omar Taha", "omar.taha@school.edu", "Senior Instructor"),
            ("Eng. Layla Fathy", "layla.fathy@school.edu", "T.A."),
            ("Dr. Youssef Ibrahim", "youssef.i@school.edu", "Associate Prof."),
            ("Dr. Nour El-Din", "nour.eldin@school.edu", "Doctor"),
            ("Eng. Mostafa Bakr", "mostafa.bakr@school.edu", "Lead Instructor"),
            ("Dr. Dina Mahfouz", "dina.m@school.edu", "Researcher")
        ]
        
        doctors = []
        instructors = []
        for name, email, title in staff_names:
            role = UserRole.instructor
            user = User(name=name, email=email, password_hash=hash_password("Pass123!"), role=role)
            db.add(user)
            await db.flush()
            
            if "Dr." in name or "Prof." in name:
                staff = Doctor(name=name, email=email, title=title, phone_number=generate_phone())
                staff.faculties.extend(random.sample(faculties, 2))
                db.add(staff)
                doctors.append(staff)
            else:
                staff = Instructor(name=name, email=email, title=title, phone_number=generate_phone())
                staff.faculties.extend(random.sample(faculties, 2))
                db.add(staff)
                instructors.append(staff)
        
        await db.flush()

        print("[DEEP SEED] 5. Creating Courses for ALL Years & Terms...")
        all_courses = []
        def get_blueprint():
            return json.dumps([
                {"title": "Midterm", "assessment_type": "Midterm", "weight_pct": 20, "template_key": "mid", "enabled": True},
                {"title": "Assignment", "assessment_type": "Practical", "weight_pct": 20, "template_key": "assign", "enabled": True},
                {"title": "Final Exam", "assessment_type": "Final", "weight_pct": 60, "template_key": "final", "enabled": True},
            ])

        for dept in departments:
            faculty = next(f for f in faculties if f.id == dept.faculty_id)
            for year in range(1, faculty.total_years + 1):
                for sem in [1, 2]:
                    c_name = f"{dept.name} - Y{year} S{sem}"
                    c_code = f"{dept.name[:2].upper()}{year}{sem}0"
                    course = Course(
                        name=c_name, course_code=c_code, department_id=dept.id,
                        academic_year=year, semester=sem, credits=3.0, passing_score=60.0,
                        doctor_id=random.choice(doctors).id, instructor_id=random.choice(instructors).id,
                        assessment_blueprint=get_blueprint()
                    )
                    db.add(course)
                    await db.flush()
                    all_courses.append(course)

                    # Assessments
                    now = datetime.now(timezone.utc)
                    # S1: All Finished. S2: Midterm/Assign Finished, Final Pending.
                    s1_finished = (sem == 1)
                    mid = Assessment(title="Midterm", assessment_type="Midterm", course_code=course.id, status="Finished", max_score=20, weight_pct=20, template_key="mid", scheduled_date=now - timedelta(days=60), academic_year=year)
                    ass = Assessment(title="Assignment", assessment_type="Practical", course_code=course.id, status="Finished", max_score=20, weight_pct=20, template_key="assign", scheduled_date=now - timedelta(days=30), academic_year=year)
                    fin = Assessment(title="Final Exam", assessment_type="Final", course_code=course.id, status="Finished" if s1_finished else "Pending", max_score=60, weight_pct=60, template_key="final", scheduled_date=(now - timedelta(days=5)) if s1_finished else (now + timedelta(days=15)), academic_year=year)
                    db.add_all([mid, ass, fin])

        print("[DEEP SEED] 6. Populating Students (6 per Year/Dept cohort)...")
        first_names = ["Mohamed", "Ahmed", "Fatma", "Nour", "Layla", "Khaled", "Omar", "Youssef", "Mona", "Sara"]
        last_names = ["Hassan", "Ali", "Taha", "Ibrahim", "Mansour", "Salah", "Zaki", "Gaber", "Fathy", "Bakr"]

        for dept in departments:
            faculty = next(f for f in faculties if f.id == dept.faculty_id)
            for year in range(1, faculty.total_years + 1):
                for i in range(6):
                    s_name = f"{random.choice(first_names)} {random.choice(last_names)}"
                    uid = f"{202400 + dept.id*100 + year*10 + i}"
                    s_email = f"{s_name.replace(' ', '.').lower()}.{uid}@student.edu"
                    
                    user = User(name=s_name, email=s_email, password_hash=hash_password("Pass123!"), role=UserRole.student)
                    db.add(user)
                    await db.flush()
                    
                    student = Student(
                        name=s_name, email=s_email, rfid_uid=secrets.token_hex(4).upper(),
                        university_id=uid, department_id=dept.id, academic_year=year,
                        approval_status=ApprovalStatus.APPROVED, academic_status=AcademicStatus.ACTIVE,
                        current_semester=2
                    )
                    db.add(student)
                    await db.flush()

                    # Enrollments
                    levels_courses = [c for c in all_courses if c.department_id == dept.id and c.academic_year == year]
                    for c in levels_courses:
                        enroll = Enrollment(student_id=student.id, course_id=c.id, is_current=(c.semester == 2))
                        db.add(enroll)
                        await db.flush()

                        # Grades
                        if c.semester == 1:
                            # S1 History (Pass)
                            mid_id = (await db.execute(select(Assessment.id).where(Assessment.course_code == c.id, Assessment.template_key == "mid"))).scalar()
                            ass_id = (await db.execute(select(Assessment.id).where(Assessment.course_code == c.id, Assessment.template_key == "assign"))).scalar()
                            fin_id = (await db.execute(select(Assessment.id).where(Assessment.course_code == c.id, Assessment.template_key == "final"))).scalar()
                            
                            db.add(GradeResult(assessment_id=mid_id, student_id=student.id, raw_score=random.uniform(14, 20)))
                            db.add(GradeResult(assessment_id=ass_id, student_id=student.id, raw_score=random.uniform(15, 20)))
                            db.add(GradeResult(assessment_id=fin_id, student_id=student.id, raw_score=random.uniform(40, 60)))
                            
                            enroll.final_percentage = random.uniform(70, 95)
                            enroll.result = "PASSED"
                        else:
                            # S2 Current
                            mid_id = (await db.execute(select(Assessment.id).where(Assessment.course_code == c.id, Assessment.template_key == "mid"))).scalar()
                            ass_id = (await db.execute(select(Assessment.id).where(Assessment.course_code == c.id, Assessment.template_key == "assign"))).scalar()
                            db.add(GradeResult(assessment_id=mid_id, student_id=student.id, raw_score=random.uniform(12, 19)))
                            db.add(GradeResult(assessment_id=ass_id, student_id=student.id, raw_score=random.uniform(13, 19)))

        await db.commit()
        print("[DEEP SEED] SUCCESS: University populated with full multi-year curriculum (Egypt-styled mock data).")

if __name__ == "__main__":
    asyncio.run(super_seed())
