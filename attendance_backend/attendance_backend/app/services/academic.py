from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.student import Student, AcademicStatus
from app.models.course import Course
from app.models.session import Session
from app.models.attendance import Attendance, AttendanceStatus
from app.models.assessment import Assessment
from app.models.grade_result import GradeResult
from app.models.enrollment import Enrollment
from app.models.academic_record import AcademicRecord


async def calculate_attendance_percentage(db: AsyncSession, student_id: int, course_id: int, enrollment: Enrollment = None) -> float:
    # 1. Use provided enrollment or fetch current one to filter by 'enrolled_at' date
    if not enrollment:
        enrollment_q = select(Enrollment).where(
            Enrollment.student_id == student_id, 
            Enrollment.course_id == course_id, 
            Enrollment.is_current == True
        ).limit(1)
        enrollment_res = await db.execute(enrollment_q)
        enrollment = enrollment_res.scalar_one_or_none()
    
    # Get total sessions for this course held AFTER enrollment
    total_sessions_query = select(func.count(Session.id)).where(Session.course_id == course_id)
    if enrollment and enrollment.enrolled_at:
        total_sessions_query = total_sessions_query.where(Session.start_time >= enrollment.enrolled_at)
        
    total_sessions_result = await db.execute(total_sessions_query)
    total_sessions = total_sessions_result.scalar() or 0

    if total_sessions == 0:
        return 0.0  # Real-Time Ecosystem: 0 sessions means 0% attended

    # Get attended sessions for this student in this course
    attended_query = (
        select(func.count(Attendance.id))
        .join(Session, Session.id == Attendance.session_id)
        .where(
            Session.course_id == course_id,
            Attendance.student_id == student_id,
            Attendance.status != AttendanceStatus.absent
        )
    )
    if enrollment and enrollment.enrolled_at:
        attended_query = attended_query.where(Session.start_time >= enrollment.enrolled_at)

    attended_result = await db.execute(attended_query)
    attended_sessions = attended_result.scalar() or 0

    return round((attended_sessions / total_sessions) * 100.0, 1)


async def calculate_course_final(db: AsyncSession, student_id: int, course_id: int) -> tuple[float, float, bool, float]:
    # Get all assessments for this course
    assessments_query = select(Assessment).where(Assessment.course_code == course_id)
    assessments_result = await db.execute(assessments_query)
    assessments = assessments_result.scalars().all()

    if not assessments:
        return 0.0, 0.0, False, 0.0

    total_progress = 0.0
    live_weighted_score = 0.0
    total_live_weights = 0.0
    global_finished_weight = 0.0
    failed_final_rule = False

    for assessment in assessments:
        # 1. Global Progress Intelligence: Sum weights of assessments that are 'Finished' for the class
        if assessment.status == "Finished":
            global_finished_weight += assessment.weight_pct

        # 2. Individual performance
        grade_query = select(GradeResult).where(
            GradeResult.assessment_id == assessment.id,
            GradeResult.student_id == student_id
        )
        grade_result_curr = await db.execute(grade_query)
        grade = grade_result_curr.scalars().first()

        max_score = assessment.max_score if assessment.max_score > 0 else 1.0
        weight = assessment.weight_pct
        
        if grade:
            raw_score = grade.raw_score
            live_weighted_score += (raw_score / max_score) * weight
            total_live_weights += weight
            total_progress += (raw_score / max_score) * weight
        else:
            raw_score = 0.0

        # Rule: Must pass 60% of the Final Exam's own degree
        if assessment.template_key == "final" and grade:
            if (grade.raw_score / max_score) < 0.6:
                failed_final_rule = True

    live_average = round((live_weighted_score / total_live_weights * 100.0), 2) if total_live_weights > 0 else 0.0

    return live_average, total_progress, failed_final_rule, global_finished_weight


async def process_student_progression(db: AsyncSession, student_id: int, year: int) -> AcademicRecord:
    # Process progression for a specific year
    student_query = select(Student).where(Student.id == student_id)
    student_result = await db.execute(student_query)
    student = student_result.scalars().first()

    if not student:
        raise ValueError("Student not found")

    # Get all courses enrolled by the student
    enrollments_query = (
        select(Enrollment, Course)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Enrollment.student_id == student_id, Course.academic_year == year)
    )
    enrollments_result = await db.execute(enrollments_query)
    enrollments = enrollments_result.all()

    failed_courses_count = 0
    failed_course_names = []
    total_weighted_sum = 0.0
    total_credits = 0.0

    for enrollment, course in enrollments:
        attendance_pct = await calculate_attendance_percentage(db, student_id, course.id, enrollment)
        live_avg, total_prog, failed_final_rule, global_weight = await calculate_course_final(db, student_id, course.id)
        
        # Enforce attendance rule unless an exception is granted
        attendance_passed = (attendance_pct >= 75.0) or enrollment.attendance_exception
        is_passed = (live_avg >= course.passing_score) and attendance_passed and (not failed_final_rule)
        
        if not is_passed:
            failed_courses_count += 1
            failed_course_names.append(course.name)
            
        total_weighted_sum += live_avg * course.credits
        total_credits += course.credits
        
    overall_average = round((total_weighted_sum / total_credits), 2) if total_credits > 0 else 0.0

    # Determine status and next year
    status_at_time = ""
    import json
    
    if failed_courses_count == 0:
        status_at_time = "PROMOTED"
        if student.academic_year == 6:
            student.academic_status = AcademicStatus.GRADUated
        else:
            student.academic_status = AcademicStatus.ACTIVE
            student.academic_year += 1
    elif failed_courses_count <= 2:
        status_at_time = "CARRY_OVER"
        student.academic_status = AcademicStatus.PROBATION
        if student.academic_year < 6:
            student.academic_year += 1
    else:
        # REPEATER Logic with DISMISSED Check
        status_at_time = "REPEATER"
        
        # If student is already a REPEATER and fails again, they are DISMISSED
        if student.academic_status == AcademicStatus.REPEATER:
            student.academic_status = AcademicStatus.DISMISSED
            status_at_time = "DISMISSED"
        else:
            student.academic_status = AcademicStatus.REPEATER
        
    # Reset semester
    student.current_semester = 1

    # Save snapshot
    record = AcademicRecord(
        student_id=student_id,
        academic_year=year,
        semester=2, # End of year
        weighted_average=overall_average,
        total_credits=total_credits,
        failed_courses=failed_courses_count,
        failed_courses_json=json.dumps(failed_course_names),
        status_at_time=status_at_time
    )
    
    db.add(record)
    await db.commit()
    await db.refresh(record)
    
    return record
