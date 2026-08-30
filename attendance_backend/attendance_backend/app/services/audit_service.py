from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.course import Course
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.assessment import Assessment, AssessmentType
from app.models.enrollment import Enrollment
from app.models.student import Student
from app.models.grade_result import GradeResult

async def perform_academic_audit(db: AsyncSession, academic_year: int = None, semester: int = None) -> Dict[str, Any]:
    """
    The Upgrade Guard Deep-Scan utility that verifies:
      - Every active course has its mandatory assessments.
      - Every mandatory assessment is in 'Finished' status.
      - Every student enrolled has a valid grade for these assessments.
    Returns: A hierarchical Error Object: Faculty > Department > Year > Course > Errors.
             If empty, audit passes!
    """
    errors = {}

    # Find courses to audit
    query = select(Course)
    if academic_year is not None:
        query = query.where(Course.academic_year == academic_year)
    if semester is not None:
        query = query.where(Course.semester == semester)
        
    result = await db.execute(query)
    courses = result.scalars().all()
    for course in courses:
        course_errors = []
        
        # Load assessments for this course
        ass_result = await db.execute(select(Assessment).where(Assessment.course_code == course.id))
        assessments = ass_result.scalars().all()
        assessments_by_key = {a.template_key: a for a in assessments}

        # 1. Tier 1: Mathematical Integrity
        total_weight = sum([a.weight_pct for a in assessments])
        if abs(total_weight - 100.0) > 0.01:
            course_errors.append({
                "type": "math",
                "message": f"Logic Error: Weights sum to {total_weight}%. Must be exactly 100%.",
                "severity": "high"
            })

        # 2. Check Mandatory Assessments (Tier 2 Checklist)
        roadmap_checks = [
            ("Quiz 1", "quiz_1"),
            ("Midterm Exam", "midterm"),
            ("Quiz 2", "quiz_2"),
            ("Final Exam", "final")
        ]
        if course.has_practical:
            roadmap_checks.insert(3, ("Practical Exam", "practical"))

        for label, key in roadmap_checks:
            assessment = assessments_by_key.get(key)
            if not assessment:
                course_errors.append({
                    "type": "blueprint",
                    "message": f"Blueprint Error: {label} has not been created yet.",
                    "severity": "high",
                    "course_id": course.id,
                    "key": key
                })
            elif assessment.status != "Finished":
                course_errors.append({
                    "type": "hygiene",
                    "message": f"Assessment '{label}' is not Finished. Status: {assessment.status}",
                    "severity": "medium",
                    "assessment_id": assessment.id,
                    "course_id": course.id
                })
            else:
                # 3. Check Grades (Tier 3)
                enrollments_query = select(Enrollment).where(Enrollment.course_id == course.id, Enrollment.status == "ACTIVE")
                enrollments_result = await db.execute(enrollments_query)
                enrollments = enrollments_result.scalars().all()
                student_ids = [e.student_id for e in enrollments]
                
                if student_ids:
                    grade_results_query = select(GradeResult).where(GradeResult.assessment_id == assessment.id)
                    grade_results_res = await db.execute(grade_results_query)
                    grade_results = grade_results_res.scalars().all()
                    
                    graded_student_ids = {gr.student_id for gr in grade_results}
                    missing_students_ids = set(student_ids) - graded_student_ids
                    if missing_students_ids:
                        course_errors.append({
                            "type": "health",
                            "message": f"Assessment '{label}' lacks grades for {len(missing_students_ids)} students.",
                            "severity": "high",
                            "assessment_id": assessment.id,
                            "course_id": course.id,
                            "missing_count": len(missing_students_ids)
                        })

        # 4. Attendance Policy Audit
        from app.services.academic import calculate_attendance_percentage
        attendance_failures = 0
        for enrollment in [e for e in (await db.execute(select(Enrollment).where(Enrollment.course_id == course.id))).scalars().all()]:
            if enrollment.status == "ACTIVE" and not enrollment.attendance_exception:
                att_pct = await calculate_attendance_percentage(db, enrollment.student_id, course.id)
                if att_pct < 75.0:
                    attendance_failures += 1
        
        if attendance_failures > 0:
            course_errors.append({
                "type": "health",
                "message": f"Attendance Integrity: {attendance_failures} students failed the 75% threshold.",
                "severity": "medium",
                "course_id": course.id
            })

        if course_errors:
            # Build hierarchy
            dept_res = await db.execute(select(Department).where(Department.id == course.department_id))
            dept = dept_res.scalars().first()
            fac_res = await db.execute(select(Faculty).where(Faculty.id == (dept.faculty_id if dept else None)))
            fac = fac_res.scalars().first()
            
            fac_name = fac.name if fac else "Standard Faculty"
            dept_name = dept.name if dept else "Main Department"
            yr = f"Year {course.academic_year}" if course.academic_year else "Archive"
            
            if fac_name not in errors: errors[fac_name] = {}
            if dept_name not in errors[fac_name]: errors[fac_name][dept_name] = {}
            if yr not in errors[fac_name][dept_name]: errors[fac_name][dept_name][yr] = {}
            errors[fac_name][dept_name][yr][course.name] = course_errors

    return errors
