from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Any

from app.db.database import get_db
from app.models.student import Student
from app.models.academic_record import AcademicRecord
from app.models.user import UserRole, User
from app.core.security import require_super_admin, require_admin, require_doctor, require_any, verify_password
from app.services.academic import process_student_progression, calculate_course_final, calculate_attendance_percentage
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.services.audit_service import perform_academic_audit
from pydantic import BaseModel

class TransitionRequest(BaseModel):
    academic_password: str

router = APIRouter(prefix="/academic", tags=["Academic Progression"])


@router.get("/students/{student_id}/transcript")
async def get_student_transcript(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any)
):
    """Get full history of a student's grades, attendances, and academic standing."""
    # Verify student exists
    student_query = select(Student).where(Student.id == student_id)
    student_result = await db.execute(student_query)
    student = student_result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get academic records
    records_query = select(AcademicRecord).where(AcademicRecord.student_id == student_id).order_by(AcademicRecord.academic_year)
    records_result = await db.execute(records_query)
    academic_records = records_result.scalars().all()

    # Get current enrollments performance
    enrollments_query = (
        select(Enrollment, Course)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Enrollment.student_id == student_id)
    )
    enrollments_result = await db.execute(enrollments_query)
    
    current_courses = []
    total_weighted_score = 0.0
    total_credits = 0.0
    elective_credits_earned = 0.0
    elective_credits_required = 10.0 # Standard Medicine Requirement

    for enrollment, course in enrollments_result.all():
        attendance_pct = await calculate_attendance_percentage(db, student_id, course.id)
        live_avg, total_prog, failed_final_rule, _gw = await calculate_course_final(db, student_id, course.id)
        
        is_passed = (live_avg >= course.passing_score) and (attendance_pct >= 75.0) and (not failed_final_rule)
        
        if is_passed and course.is_elective:
            elective_credits_earned += course.credits
        
        current_courses.append({
            "course_id": course.id,
            "course_name": course.name,
            "credits": course.credits,
            "academic_year": course.academic_year,
            "semester": course.semester,
            "attendance_percentage": attendance_pct,
            "final_score": live_avg,
            "passing_score": course.passing_score,
            "is_passed": is_passed
        })
        
        total_weighted_score += (live_avg * course.credits)
        total_credits += course.credits
        
    current_weighted_avg = (total_weighted_score / total_credits) if total_credits > 0 else 0.0

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "academic_year": student.academic_year,
            "current_semester": student.current_semester,
            "academic_status": student.academic_status.value if hasattr(student.academic_status, "value") else student.academic_status
        },
        "current_weighted_average": current_weighted_avg,
        "elective_credits_earned": elective_credits_earned,
        "elective_credits_required": elective_credits_required,
        "academic_records": [
            {
                "id": rec.id,
                "academic_year": rec.academic_year,
                "semester": rec.semester,
                "weighted_average": rec.weighted_average,
                "total_credits": rec.total_credits,
                "failed_courses": rec.failed_courses,
                "failed_courses_json": rec.failed_courses_json,
                "status_at_time": rec.status_at_time,
                "created_at": rec.created_at
            } for rec in academic_records
        ],
        "courses": current_courses
    }


@router.post("/process-promotion")
async def process_batch_promotion(
    academic_year: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_super_admin)
):
    """Process year-end promotion for all active students in a given academic year."""

    students_query = select(Student).where(Student.academic_year == academic_year)
    students_result = await db.execute(students_query)
    students = students_result.scalars().all()
    
    if not students:
        return {"message": f"No active students found in year {academic_year}"}

    processed_count = 0
    results = []

    for student in students:
        try:
            record = await process_student_progression(db, student.id, academic_year)
            results.append({
                "student_id": student.id,
                "name": student.name,
                "status": record.status_at_time,
                "failed_courses": record.failed_courses,
                "new_year": student.academic_year
            })
            processed_count += 1
        except Exception as e:
            results.append({
                "student_id": student.id,
                "name": student.name,
                "error": str(e)
            })

    return {
        "message": f"Processed {processed_count} students successfully.",
        "results": results
    }

@router.get("/readiness")
async def get_university_readiness(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_doctor)
):
    """Perform the 4-tier Upgrade Guard audit without executing the transition."""
    audit_errors = await perform_academic_audit(db)
    return {
        "is_ready": len(audit_errors) == 0,
        "audit_report": audit_errors
    }

@router.post("/transition")
async def transition_term(
    payload: TransitionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_super_admin)
):
    """Global transition: S1 -> S2, or S2 -> Next Year with auto pass/fail.
    Archives current enrollments with is_current=False and stamps final grades."""
    from app.models.term_config import TermConfig
    
    email = current_user.get("sub")
    
    # 1. Verify password
    user_query = await db.execute(select(User).where(User.email == email))
    user = user_query.scalar_one_or_none()
    
    if not user or not user.academic_password_hash:
        raise HTTPException(
            status_code=403, 
            detail="You must set an Academic Transition Password in your User settings before performing this action."
        )
        
    if not verify_password(payload.academic_password, user.academic_password_hash):
        raise HTTPException(status_code=401, detail="Invalid Academic Transition Password.")

    # 2. RUN UPGRADE GUARD: Academic Audit
    audit_errors = await perform_academic_audit(db)
    if audit_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "UPGRADE GUARD LOCKED: Incomplete assessments or grades.",
                "audit_report": audit_errors
            }
        )

    # 3. Get or create TermConfig
    term_result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
    term_config = term_result.scalars().first()
    if not term_config:
        term_config = TermConfig(id=1, academic_year_label="2025/2026", current_year_start=2025, current_semester=1)
        db.add(term_config)
        await db.flush()

    current_sem = term_config.current_semester
    year_label = term_config.academic_year_label

    # 4. Get all active students
    students_query = await db.execute(select(Student).where(Student.academic_status != "GRADUATED"))
    students = students_query.scalars().all()
    
    results = []
    
    for student in students:
        # Archive current enrollments: stamp final grades and set is_current=False
        current_enrollments_q = await db.execute(
            select(Enrollment, Course)
            .join(Course, Course.id == Enrollment.course_id)
            .where(
                Enrollment.student_id == student.id,
                Enrollment.is_current == True
            )
        )
        current_enrollments = current_enrollments_q.all()
        
        for enrollment, course in current_enrollments:
            # Calculate and stamp the final grade
            live_avg, total_prog, failed_final_rule, _gw = await calculate_course_final(db, student.id, course.id)
            attendance_pct = await calculate_attendance_percentage(db, student.id, course.id)
            is_passed = (live_avg >= course.passing_score) and (attendance_pct >= 75.0) and (not failed_final_rule)
            
            enrollment.is_current = False
            enrollment.final_percentage = round(live_avg, 2)
            enrollment.result = "PASSED" if is_passed else "FAILED"
            enrollment.semester_snapshot = current_sem
            if not enrollment.academic_year_snapshot:
                enrollment.academic_year_snapshot = student.academic_year

        if current_sem == 1:
            # Transition S1 to S2
            student.current_semester = 2
            results.append({"student_id": student.id, "name": student.name, "action": "Moved to Semester 2"})
            db.add(student)
        elif current_sem == 2:
            # End of year, process full progression
            try:
                record = await process_student_progression(db, student.id, student.academic_year)
                # Enrich the record with the new audit fields
                record.academic_year_label = year_label
                record.year_level = student.academic_year
                record.result_type = record.status_at_time
                
                results.append({
                    "student_id": student.id,
                    "name": student.name,
                    "action": "Processed End of Year",
                    "new_status": record.status_at_time,
                    "new_year": student.academic_year
                })
            except Exception as e:
                results.append({"student_id": student.id, "name": student.name, "error": str(e)})

    # 5. Update TermConfig
    if current_sem == 1:
        term_config.current_semester = 2
    else:
        # Move to next academic year, semester 1
        term_config.current_semester = 1
        term_config.current_year_start += 1
        new_start = term_config.current_year_start
        term_config.academic_year_label = f"{new_start}/{new_start + 1}"

    await db.commit()
    
    return {
        "message": "Global academic transition completed.",
        "new_term": {
            "academic_year_label": term_config.academic_year_label,
            "current_semester": term_config.current_semester
        },
        "details": results
    }


@router.patch("/enrollments/{enrollment_id}/attendance-exception")
async def toggle_attendance_exception(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Toggle the attendance exception flag for a specific enrollment."""
    result = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    enrollment = result.scalar_one_or_none()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
        
    enrollment.attendance_exception = not enrollment.attendance_exception
    await db.commit()
    
    return {"message": "Attendance exception toggled", "status": enrollment.attendance_exception}


@router.get("/faculties/{faculty_id}/report")
async def get_faculty_report(
    faculty_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any)
):
    """Aggregate academic performance report for an entire faculty."""
    from app.models.faculty import Faculty
    from app.models.department import Department

    # Verify faculty exists
    fac_result = await db.execute(select(Faculty).where(Faculty.id == faculty_id))
    faculty = fac_result.scalar_one_or_none()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Get all departments in the faculty
    dept_result = await db.execute(select(Department).where(Department.faculty_id == faculty_id))
    dept_ids = [d.id for d in dept_result.scalars().all()]

    # Get all students in those departments
    students_q = select(Student).where(Student.department_id.in_(dept_ids)) if dept_ids else select(Student).where(False)
    students_result = await db.execute(students_q)
    students = students_result.scalars().all()

    student_reports = []
    total_gpa_sum = 0.0
    total_passed = 0
    total_failed = 0
    total_students = len(students)

    for student in students:
        # Get current enrollments
        enrollments_q = (
            select(Enrollment, Course)
            .join(Course, Course.id == Enrollment.course_id)
            .where(Enrollment.student_id == student.id, Enrollment.is_current == True)
        )
        enrollments_result = await db.execute(enrollments_q)
        enrollments = enrollments_result.all()

        weighted_sum = 0.0
        credits_sum = 0.0
        failed_count = 0
        att_sum = 0.0
        att_count = 0

        for enrollment, course in enrollments:
            attendance_pct = await calculate_attendance_percentage(db, student.id, course.id)
            live_avg, total_prog, failed_final_rule, _gw = await calculate_course_final(db, student.id, course.id)
            is_passed = (live_avg >= course.passing_score) and (attendance_pct >= 75.0) and (not failed_final_rule)
            if not is_passed:
                failed_count += 1
            weighted_sum += live_avg * course.credits
            credits_sum += course.credits
            att_sum += attendance_pct
            att_count += 1

        gpa = (weighted_sum / credits_sum) if credits_sum > 0 else 0.0
        attendance_avg = (att_sum / att_count) if att_count > 0 else 0.0
        total_gpa_sum += gpa

        if failed_count == 0:
            total_passed += 1
        else:
            total_failed += 1

        student_reports.append({
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "department_id": student.department_id,
            "academic_year": student.academic_year,
            "academic_status": student.academic_status.value,
            "gpa": round(gpa, 2),
            "attendance_rate": round(attendance_avg, 1),
            "failed_courses": failed_count,
        })

    return {
        "faculty_id": faculty_id,
        "faculty_name": faculty.name,
        "total_students": total_students,
        "average_gpa": round(total_gpa_sum / total_students, 2) if total_students > 0 else 0,
        "passed_count": total_passed,
        "failed_count": total_failed,
        "students": student_reports,
    }


@router.get("/departments/{department_id}/report")
async def get_department_report(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any)
):
    """Aggregate academic performance report for a specific department."""
    from app.models.department import Department

    # Verify department exists
    dept_result = await db.execute(select(Department).where(Department.id == department_id))
    department = dept_result.scalar_one_or_none()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    # Get all students in the department
    students_result = await db.execute(select(Student).where(Student.department_id == department_id))
    students = students_result.scalars().all()

    student_reports = []
    total_gpa_sum = 0.0
    total_passed = 0
    total_failed = 0
    total_students = len(students)

    for student in students:
        enrollments_q = (
            select(Enrollment, Course)
            .join(Course, Course.id == Enrollment.course_id)
            .where(Enrollment.student_id == student.id, Enrollment.is_current == True)
        )
        enrollments_result = await db.execute(enrollments_q)
        enrollments = enrollments_result.all()

        weighted_sum = 0.0
        credits_sum = 0.0
        failed_count = 0
        att_sum = 0.0
        att_count = 0

        for enrollment, course in enrollments:
            attendance_pct = await calculate_attendance_percentage(db, student.id, course.id)
            live_avg, total_prog, failed_final_rule, _gw = await calculate_course_final(db, student.id, course.id)
            is_passed = (live_avg >= course.passing_score) and (attendance_pct >= 75.0) and (not failed_final_rule)
            if not is_passed:
                failed_count += 1
            weighted_sum += live_avg * course.credits
            credits_sum += course.credits
            att_sum += attendance_pct
            att_count += 1

        gpa = (weighted_sum / credits_sum) if credits_sum > 0 else 0.0
        attendance_avg = (att_sum / att_count) if att_count > 0 else 0.0
        total_gpa_sum += gpa

        if failed_count == 0:
            total_passed += 1
        else:
            total_failed += 1

        student_reports.append({
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "academic_year": student.academic_year,
            "academic_status": student.academic_status.value,
            "gpa": round(gpa, 2),
            "attendance_rate": round(attendance_avg, 1),
            "failed_courses": failed_count,
        })

    return {
        "department_id": department_id,
        "department_name": department.name,
        "faculty_id": department.faculty_id,
        "total_students": total_students,
        "average_gpa": round(total_gpa_sum / total_students, 2) if total_students > 0 else 0,
        "passed_count": total_passed,
        "failed_count": total_failed,
        "students": student_reports,
    }
