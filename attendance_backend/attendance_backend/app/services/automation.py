from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment


async def enroll_student_in_current_courses(db: AsyncSession, student_id: int, department_id: int):
    """
    Enrolls a student ONLY in courses matching their current academic_year AND current_semester
    within the given department. Skips courses they're already enrolled in.
    """
    if not department_id:
        return 0

    # 1. Get the student to know their year and semester
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        print(f"[WARN] Student {student_id} not found. No auto-enrollments performed.")
        return 0

    year = student.academic_year
    semester = student.current_semester

    if not year:
        print(f"[WARN] Student {student_id} has no academic_year set. No auto-enrollments performed.")
        return 0

    # 2. Fetch courses in this department matching the student's year and semester
    result = await db.execute(
        select(Course).where(
            Course.department_id == department_id,
            Course.academic_year == year,
            Course.semester == semester
        )
    )
    courses = result.scalars().all()

    if not courses:
        print(f"[WARN] Department {department_id} has 0 courses for Year {year} Semester {semester}.")
        return 0

    # 3. Check existing ACTIVE enrollments to avoid duplicates
    existing_result = await db.execute(
        select(Enrollment.course_id).where(
            Enrollment.student_id == student_id,
            Enrollment.status == "ACTIVE"
        )
    )
    enrolled_course_ids = set(existing_result.scalars().all())

    # 4. Create new enrollments
    count = 0
    for course in courses:
        if course.id not in enrolled_course_ids:
            # Check prerequisite: if course has parent, ensure parent is COMPLETED
            if course.parent_course_id:
                prereq_result = await db.execute(
                    select(Enrollment).where(
                        Enrollment.student_id == student_id,
                        Enrollment.course_id == course.parent_course_id,
                        Enrollment.status == "COMPLETED"
                    )
                )
                if not prereq_result.scalar_one_or_none():
                    print(f"[SKIP] Student {student_id} missing prerequisite for {course.name} (needs course_id={course.parent_course_id})")
                    continue

            new_enrollment = Enrollment(
                student_id=student_id,
                course_id=course.id,
                status="ACTIVE",
                academic_year_snapshot=year
            )
            db.add(new_enrollment)
            count += 1

    await db.flush()
    return count


# Keep backward-compatible alias for existing code that may reference the old function
async def enroll_student_in_department_courses(db: AsyncSession, student_id: int, department_id: int):
    """
    Backward-compatible wrapper. Now delegates to the year-aware enrollment.
    """
    return await enroll_student_in_current_courses(db, student_id, department_id)
