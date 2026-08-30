from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.instructor import Instructor
from app.models.doctor import Doctor
from app.models.course import Course

async def get_scoped_department_ids(current_user: dict, db: AsyncSession) -> list[int]:
    """
    Returns a list of department IDs the current user (Engineer or Doctor) is assigned to.
    Returns an empty list for Super Admin/Admin (as they have global access) or unassigned users.
    """
    role = current_user.get("role")
    dept_ids = []
    
    if role == "engineer":
        eng_id = current_user.get("instructor_id")
        if eng_id:
            res = await db.execute(
                select(Instructor).options(selectinload(Instructor.departments))
                .where(Instructor.id == eng_id)
            )
            obj = res.scalar_one_or_none()
            if obj:
                dept_ids = [d.id for d in obj.departments]
            
            # Also dynamically include departments of courses they teach
            course_res = await db.execute(
                select(Course.department_id).where(Course.instructor_id == eng_id)
            )
            dept_ids.extend([row[0] for row in course_res.all() if row[0] is not None])
                
    elif role == "doctor":
        doc_id = current_user.get("doctor_id")
        if doc_id:
            res = await db.execute(
                select(Doctor).options(selectinload(Doctor.departments))
                .where(Doctor.id == doc_id)
            )
            obj = res.scalar_one_or_none()
            if obj:
                dept_ids = [d.id for d in obj.departments]
            
            # Also dynamically include departments of courses they teach
            course_res = await db.execute(
                select(Course.department_id).where(Course.doctor_id == doc_id)
            )
            dept_ids.extend([row[0] for row in course_res.all() if row[0] is not None])
                
    return list(set(dept_ids))

async def get_scoped_faculty_ids(current_user: dict, db: AsyncSession) -> list[int]:
    """
    Returns a list of faculty IDs the current user is assigned to.
    """
    role = current_user.get("role")
    fac_ids = []
    
    if role == "engineer":
        eng_id = current_user.get("instructor_id")
        if eng_id:
            res = await db.execute(
                select(Instructor).options(selectinload(Instructor.faculties))
                .where(Instructor.id == eng_id)
            )
            obj = res.scalar_one_or_none()
            if obj:
                fac_ids = [f.id for f in obj.faculties]
            
            # Also dynamically include faculties of courses they teach
            from app.models.department import Department
            fac_res = await db.execute(
                select(Department.faculty_id)
                .join(Course, Course.department_id == Department.id)
                .where(Course.instructor_id == eng_id)
            )
            fac_ids.extend([row[0] for row in fac_res.all() if row[0] is not None])
                
    elif role == "doctor":
        doc_id = current_user.get("doctor_id")
        if doc_id:
            res = await db.execute(
                select(Doctor).options(selectinload(Doctor.faculties))
                .where(Doctor.id == doc_id)
            )
            obj = res.scalar_one_or_none()
            if obj:
                fac_ids = [f.id for f in obj.faculties]
            
            # Also dynamically include faculties of courses they teach
            from app.models.department import Department
            fac_res = await db.execute(
                select(Department.faculty_id)
                .join(Course, Course.department_id == Department.id)
                .where(Course.doctor_id == doc_id)
            )
            fac_ids.extend([row[0] for row in fac_res.all() if row[0] is not None])
                
    return list(set(fac_ids))

