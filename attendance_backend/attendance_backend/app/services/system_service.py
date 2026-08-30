import io
import zipfile
import json
import csv
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.user import User
from app.models.student import Student
from app.models.doctor import Doctor
from app.models.instructor import Instructor
from app.models.course import Course
from app.models.session import Session
from app.models.attendance import Attendance
from app.models.activity import SystemActivity, SessionTelemetry

async def generate_database_backup(db: AsyncSession) -> io.BytesIO:
    """
    Generates an in-memory ZIP file containing all major system data 
    structured in beautiful JSON and CSV formats.
    """
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        
        # Helper to write CSV
        def write_csv(path, headers, rows):
            csv_buf = io.StringIO()
            writer = csv.writer(csv_buf)
            writer.writerow(headers)
            writer.writerows(rows)
            zip_file.writestr(path, csv_buf.getvalue())

        # 1. Users (Admins, Doctors, Instructors)
        users = (await db.execute(select(User))).scalars().all()
        doctors = (await db.execute(select(Doctor))).scalars().all()
        instructors = (await db.execute(select(Instructor))).scalars().all()
        
        staff_data = {
            "metadata": {"exported_at": datetime.utcnow().isoformat(), "total_users": len(users)},
            "users": [{"id": u.id, "email": u.email, "role": u.role} for u in users],
            "doctors": [{"id": d.id, "name": d.name, "email": d.email, "title": d.title} for d in doctors],
            "instructors": [{"id": i.id, "name": i.name, "email": i.email, "title": i.title} for i in instructors]
        }
        zip_file.writestr("JSON/Admins_and_Staff.json", json.dumps(staff_data, indent=4))
        
        write_csv("CSV/Users.csv", ["ID", "Email", "Role"], [[u.id, u.email, u.role] for u in users])
        write_csv("CSV/Doctors.csv", ["ID", "Name", "Email", "Title"], [[d.id, d.name, d.email, d.title] for d in doctors])
        write_csv("CSV/Instructors.csv", ["ID", "Name", "Email", "Title"], [[i.id, i.name, i.email, i.title] for i in instructors])
        
        # 2. Students
        students = (await db.execute(select(Student))).scalars().all()
        student_data = {
            "students": [{"id": s.id, "name": s.name, "university_id": s.university_id, "email": s.email, "year": s.academic_year} for s in students]
        }
        zip_file.writestr("JSON/Students.json", json.dumps(student_data, indent=4))
        write_csv("CSV/Students.csv", ["ID", "Name", "University ID", "Email", "Academic Year"], 
                  [[s.id, s.name, s.university_id, s.email, s.academic_year] for s in students])
        
        # 3. Academics (Courses)
        courses = (await db.execute(select(Course))).scalars().all()
        course_data = {
            "courses": [{"id": c.id, "code": c.course_code, "name": c.name, "credits": c.credits} for c in courses]
        }
        zip_file.writestr("JSON/Courses.json", json.dumps(course_data, indent=4))
        write_csv("CSV/Courses.csv", ["ID", "Code", "Name", "Credits"], [[c.id, c.course_code, c.name, c.credits] for c in courses])
        
        # 4. Attendance
        attendances = (await db.execute(select(Attendance))).scalars().all()
        attendance_data = [{"id": a.id, "session": a.session_id, "student": a.student_id, "status": a.status, "time": a.timestamp.isoformat()} for a in attendances]
        zip_file.writestr("JSON/Attendance_Logs.json", json.dumps(attendance_data, indent=4))
        write_csv("CSV/Attendance_Logs.csv", ["ID", "Session ID", "Student ID", "Status", "Timestamp"], 
                  [[a.id, a.session_id, a.student_id, a.status, a.timestamp.isoformat()] for a in attendances])
        
        # 5. Audit & Telemetry
        activities = (await db.execute(select(SystemActivity))).scalars().all()
        telemetry = (await db.execute(select(SessionTelemetry))).scalars().all()
        
        activity_data = [{"id": a.id, "time": a.timestamp.isoformat(), "action": a.action_type, "user_email": a.user_email, "target": a.target_model, "desc": a.description} for a in activities]
        telemetry_data = [{"id": t.id, "time": t.timestamp.isoformat(), "action": t.action_type, "path": t.path, "session": t.session_id} for t in telemetry]
        
        zip_file.writestr("JSON/System_Activities.json", json.dumps(activity_data, indent=4))
        zip_file.writestr("JSON/Session_Telemetry.json", json.dumps(telemetry_data, indent=4))
        
        write_csv("CSV/System_Activities.csv", ["ID", "Timestamp", "Action", "User Email", "Target", "Description"], 
                  [[a.id, a.timestamp.isoformat(), a.action_type, a.user_email, a.target_model, a.description] for a in activities])
        write_csv("CSV/Session_Telemetry.csv", ["ID", "Timestamp", "Action", "Path", "Session ID"], 
                  [[t.id, t.timestamp.isoformat(), t.action_type, t.path, t.session_id] for t in telemetry])

    return zip_buffer

async def purge_audit_logs(db: AsyncSession):
    """
    Truncates the audit log tables.
    """
    await db.execute(text("TRUNCATE TABLE system_activities RESTART IDENTITY CASCADE;"))
    await db.execute(text("TRUNCATE TABLE session_telemetry RESTART IDENTITY CASCADE;"))
    await db.commit()
