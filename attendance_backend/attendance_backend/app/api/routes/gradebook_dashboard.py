from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional

from app.db.database import get_db
from app.models.term_config import TermConfig
from app.models.student import Student, AcademicStatus
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.department import Department
from app.models.faculty import Faculty
from app.core.security import require_any
from app.services.academic import calculate_course_final, calculate_attendance_percentage

router = APIRouter(prefix="/gradebook-dashboard", tags=["Gradebook Dashboard"])


@router.get("/term-info")
async def get_term_info(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any)
):
    """Return the current global term configuration."""
    result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
    config = result.scalars().first()

    if not config:
        # Auto-create default if missing
        config = TermConfig(id=1, academic_year_label="2025/2026", current_year_start=2025, current_semester=1)
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return {
        "academic_year_label": config.academic_year_label,
        "current_year_start": config.current_year_start,
        "current_semester": config.current_semester,
        "is_locked": config.is_locked
    }


@router.get("/report")
async def get_gradebook_report(
    faculty_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    year_level: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any)
):
    """
    Main Grade Book report endpoint.
    Returns students with their current-term final grade percentages and at-risk flags.
    Only shows data for current (is_current=True) enrollments.
    """
    import asyncio

    # Get current term info
    term_result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
    term_config = term_result.scalars().first()
    current_semester = term_config.current_semester if term_config else 1

    # Build student query with filters
    student_query = select(Student).where(Student.academic_status != AcademicStatus.GRADUATED)

    if student_id:
        student_query = student_query.where(Student.id == student_id)
    elif department_id:
        student_query = student_query.where(Student.department_id == department_id)
    elif faculty_id:
        # Get all department IDs under this faculty
        dept_query = select(Department.id).where(Department.faculty_id == faculty_id)
        dept_result = await db.execute(dept_query)
        dept_ids = [d for d in dept_result.scalars().all()]
        if dept_ids:
            student_query = student_query.where(Student.department_id.in_(dept_ids))
        else:
            return {"students": [], "total": 0, "page": page, "page_size": page_size, "term_info": None}

    if year_level:
        student_query = student_query.where(Student.academic_year == year_level)

    # Search by university_id or name
    if search:
        student_query = student_query.where(
            Student.university_id.ilike(f"%{search}%") | Student.name.ilike(f"%{search}%")
        )

    # Count total
    count_query = select(func.count()).select_from(student_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    student_query = student_query.order_by(Student.academic_year.asc(), Student.name.asc()).offset((page - 1) * page_size).limit(page_size)
    students_result = await db.execute(student_query)
    students = students_result.scalars().all()

    # Helper function for parallel processing of each student row
    async def process_student_row(student_obj):
        # Get current enrollments for this student
        # We need a new local execution or careful DB session handling because 
        # concurrent queries on the same AsyncSession are allowed ONLY if sequential, 
        # however calculate_course_final and calculate_attendance_percentage use the same 'db'.
        # For true parallel within one request, we usually need separate sessions or 
        # just do them sequentially but optimized.
        # However, to avoid 'Session is already in use' errors, we can't truly parallelize 
        # on a single AsyncSession. So we will rely on the fix below to handle 1000 records.
        
        # NOTE: Parallelism in SQLAlchemy AsyncSession is limited.
        # I'll stick to a slightly more efficient sequential approach or accept the loop
        # now that the le=1000 fix allows the request to pass validation.
        
        enroll_query = (
            select(Enrollment, Course)
            .join(Course, Course.id == Enrollment.course_id)
            .where(
                Enrollment.student_id == student_obj.id,
                Enrollment.is_current == True
            )
        )
        enroll_result = await db.execute(enroll_query)
        enrollments = enroll_result.all()

        total_weighted_score = 0.0
        total_credits = 0.0
        failed_count = 0
        course_results = []

        for enrollment, course in enrollments:
            live_avg, total_prog, failed_final_rule, global_weight = await calculate_course_final(db, student_obj.id, course.id)
            attendance_pct = await calculate_attendance_percentage(db, student_obj.id, course.id)
            is_passed = (live_avg >= course.passing_score) and (attendance_pct >= 75.0) and (not failed_final_rule)

            if not is_passed:
                failed_count += 1

            total_weighted_score += live_avg * course.credits
            total_credits += course.credits

            course_results.append({
                "course_name": course.name,
                "course_code": course.course_code,
                "final_score": round(live_avg, 2),
                "passing_score": course.passing_score,
                "is_passed": is_passed
            })

        final_grade = round(total_weighted_score / total_credits, 2) if total_credits > 0 else 0.0
        overall_passed = failed_count == 0 and total_credits > 0

        return {
            "student_id": student_obj.id,
            "university_id": student_obj.university_id or str(student_obj.id),
            "student_name": student_obj.name,
            "academic_year": student_obj.academic_year,
            "final_grade_percentage": final_grade,
            "status": "Passed" if overall_passed else "Failed",
            "failed_subject_count": failed_count,
            "at_risk": failed_count > 2,
            "total_courses": len(enrollments),
            "course_results": course_results
        }

    # Parallelize student processing
    # Note: To avoid AsyncSession concurrency errors, we process them in chunks or 
    # keep them sequential if the number is large, but for 1000 it should be okay if done carefully.
    # Actually, AsyncSession does NOT support concurrent execution. 
    # So I will just optimize the fetching of term_config to be outside the loop (done).
    
    report_rows = []
    for student in students:
        row = await process_student_row(student)
        report_rows.append(row)

    return {
        "students": report_rows,
        "total": total,
        "page": page,
        "page_size": page_size,
        "term_info": {
            "academic_year_label": term_config.academic_year_label if term_config else "N/A",
            "current_semester": current_semester
        }
    }
