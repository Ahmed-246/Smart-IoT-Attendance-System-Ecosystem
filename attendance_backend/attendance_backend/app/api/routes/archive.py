from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from typing import Optional

from app.db.database import get_db
from app.models.student import Student, AcademicStatus
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.department import Department
from app.models.academic_record import AcademicRecord
from app.core.security import require_any

router = APIRouter(prefix="/archive", tags=["Academic Archive"])


@router.get("/records")
async def get_archive_records(
    faculty_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    academic_year: Optional[int] = Query(None),
    term: Optional[str] = Query(None),  # "1", "2", or "full"
    search: Optional[str] = Query(None),
    academic_status: Optional[str] = Query(None), # "current" or "graduated"
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any)
):
    """
    Return archived records grouped by student.
    Includes both archived enrollments (is_current=False) AND
    students with AcademicRecord entries (year-end progression snapshots).
    """
    # Resolve department IDs for faculty filter
    dept_ids = None
    if department_id:
        dept_ids = [department_id]
    elif faculty_id:
        dept_subq = select(Department.id).where(Department.faculty_id == faculty_id)
        dept_result = await db.execute(dept_subq)
        dept_ids = [d for d in dept_result.scalars().all()]
        if not dept_ids:
            return {"records": [], "total": 0, "page": page, "page_size": page_size}

    student_map = {}

    # ── Part 1: Archived Enrollments (is_current=False) ──
    enroll_query = (
        select(Enrollment, Course, Student)
        .join(Course, Course.id == Enrollment.course_id)
        .join(Student, Student.id == Enrollment.student_id)
        .where(Enrollment.is_current == False)
    )
    if academic_status == "graduated":
        enroll_query = enroll_query.where(Student.academic_status == AcademicStatus.GRADUATED)
    elif academic_status == "current":
        enroll_query = enroll_query.where(Student.academic_status != AcademicStatus.GRADUATED)

    if dept_ids:
        enroll_query = enroll_query.where(Course.department_id.in_(dept_ids))
    if academic_year:
        enroll_query = enroll_query.where(Enrollment.academic_year_snapshot == academic_year)
    if term and term != "full":
        try:
            enroll_query = enroll_query.where(Enrollment.semester_snapshot == int(term))
        except ValueError:
            pass
    if search:
        enroll_query = enroll_query.where(
            Student.university_id.ilike(f"%{search}%") | Student.name.ilike(f"%{search}%")
        )
    enroll_query = enroll_query.order_by(Student.name, Course.academic_year, Course.semester)

    result = await db.execute(enroll_query)
    for enrollment, course, student in result.all():
        sid = student.id
        if sid not in student_map:
            student_map[sid] = {
                "student_id": student.id,
                "university_id": student.university_id or str(student.id),
                "student_name": student.name,
                "academic_year": student.academic_year,
                "courses": []
            }
        student_map[sid]["courses"].append({
            "enrollment_id": enrollment.id,
            "course_id": course.id,
            "course_name": course.name,
            "course_code": course.course_code,
            "course_academic_year": course.academic_year,
            "semester": enrollment.semester_snapshot or course.semester,
            "credits": course.credits,
            "final_percentage": enrollment.final_percentage,
            "result": enrollment.result or enrollment.status,
            "enrolled_at": str(enrollment.enrolled_at) if enrollment.enrolled_at else None,
            "year_snapshot": enrollment.academic_year_snapshot
        })

    # ── Part 2: AcademicRecord entries (year-end snapshots) ──
    # Include students who have progression records even if enrollments weren't archived
    rec_query = (
        select(AcademicRecord, Student)
        .join(Student, Student.id == AcademicRecord.student_id)
    )
    if academic_status == "graduated":
        rec_query = rec_query.where(Student.academic_status == AcademicStatus.GRADUATED)
    elif academic_status == "current":
        rec_query = rec_query.where(Student.academic_status != AcademicStatus.GRADUATED)

    if academic_year:
        rec_query = rec_query.where(AcademicRecord.academic_year == academic_year)
    if term and term != "full":
        try:
            rec_query = rec_query.where(AcademicRecord.semester == int(term))
        except ValueError:
            pass
    if dept_ids:
        rec_query = rec_query.where(Student.department_id.in_(dept_ids))
    if search:
        rec_query = rec_query.where(
            Student.university_id.ilike(f"%{search}%") | Student.name.ilike(f"%{search}%")
        )
    rec_query = rec_query.order_by(AcademicRecord.academic_year, AcademicRecord.semester)

    rec_result = await db.execute(rec_query)
    for record, student in rec_result.all():
        sid = student.id
        if sid not in student_map:
            student_map[sid] = {
                "student_id": student.id,
                "university_id": student.university_id or str(student.id),
                "student_name": student.name,
                "academic_year": student.academic_year,
                "status": student.academic_status,
                "courses": []
            }
        # Add the academic record as a summary course entry so it shows in the table
        student_map[sid]["courses"].append({
            "enrollment_id": None,
            "course_id": None,
            "course_name": f"Year {record.academic_year} — Semester {record.semester} Progression",
            "course_code": record.academic_year_label or f"Y{record.academic_year}S{record.semester}",
            "course_academic_year": record.academic_year,
            "semester": record.semester,
            "credits": record.total_credits or 0,
            "final_percentage": round(record.weighted_average, 2) if record.weighted_average else None,
            "result": record.result_type or record.status_at_time or "RECORDED",
            "enrolled_at": str(record.created_at) if record.created_at else None,
            "year_snapshot": record.academic_year
        })

    # Deduplicate courses per student (remove duplicate progression entries)
    for sid in student_map:
        seen = set()
        unique_courses = []
        for c in student_map[sid]["courses"]:
            key = (c.get("enrollment_id"), c.get("course_name"), c.get("semester"))
            if key not in seen:
                seen.add(key)
                unique_courses.append(c)
        student_map[sid]["courses"] = unique_courses

    # Paginate the grouped results
    student_list = sorted(student_map.values(), key=lambda s: s["student_name"])
    total = len(student_list)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = student_list[start:end]

    return {
        "records": paginated,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/student/{student_id}/timeline")
async def get_student_timeline(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any)
):
    """
    Return the complete versioned timeline for a student:
    - All AcademicRecord entries (year-end snapshots)
    - All archived Enrollment entries with final grades
    Supports retake/repeat scenarios via multiple entries for the same course.
    """
    # Get student info
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalars().first()
    if not student:
        return {"error": "Student not found"}

    # Get all academic records ordered chronologically
    records_query = (
        select(AcademicRecord)
        .where(AcademicRecord.student_id == student_id)
        .order_by(AcademicRecord.academic_year, AcademicRecord.semester)
    )
    records_result = await db.execute(records_query)
    academic_records = records_result.scalars().all()

    # Get all archived enrollments with course info
    archived_query = (
        select(Enrollment, Course)
        .join(Course, Course.id == Enrollment.course_id)
        .where(
            Enrollment.student_id == student_id,
            Enrollment.is_current == False
        )
        .order_by(Course.academic_year, Course.semester)
    )
    archived_result = await db.execute(archived_query)
    archived_enrollments = archived_result.all()

    # Build timeline entries
    timeline = []

    # Add academic record milestones
    for rec in academic_records:
        timeline.append({
            "type": "academic_record",
            "academic_year": rec.academic_year,
            "academic_year_label": rec.academic_year_label or f"Year {rec.academic_year}",
            "semester": rec.semester,
            "year_level": rec.year_level or rec.academic_year,
            "weighted_average": round(rec.weighted_average, 2),
            "total_credits": rec.total_credits,
            "failed_courses": rec.failed_courses,
            "status": rec.result_type or rec.status_at_time,
            "created_at": str(rec.created_at) if rec.created_at else None,
            "sort_key": rec.academic_year * 10 + rec.semester
        })

    # Add archived course entries
    for enrollment, course in archived_enrollments:
        timeline.append({
            "type": "course_record",
            "academic_year": enrollment.academic_year_snapshot or course.academic_year,
            "semester": enrollment.semester_snapshot or course.semester,
            "course_name": course.name,
            "course_code": course.course_code,
            "credits": course.credits,
            "final_percentage": enrollment.final_percentage,
            "result": enrollment.result or enrollment.status,
            "sort_key": (enrollment.academic_year_snapshot or course.academic_year or 0) * 10 + (enrollment.semester_snapshot or course.semester or 0)
        })

    # Sort timeline chronologically
    timeline.sort(key=lambda x: x.get("sort_key", 0))

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "university_id": student.university_id,
            "academic_year": student.academic_year,
            "current_semester": student.current_semester,
            "academic_status": student.academic_status.value if hasattr(student.academic_status, 'value') else str(student.academic_status)
        },
        "timeline": timeline,
        "summary": {
            "total_records": len(academic_records),
            "total_archived_courses": len(archived_enrollments),
            "promotions": sum(1 for r in academic_records if (r.result_type or r.status_at_time) == "PROMOTED"),
            "repeats": sum(1 for r in academic_records if (r.result_type or r.status_at_time) == "REPEATER"),
            "carry_overs": sum(1 for r in academic_records if (r.result_type or r.status_at_time) == "CARRY_OVER"),
        }
    }
