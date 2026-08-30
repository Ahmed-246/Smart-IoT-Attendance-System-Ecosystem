from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.department import Department
from app.models.faculty import Faculty
from app.schemas.schemas import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.core.security import require_admin, require_any
from app.services.scoping import get_scoped_department_ids

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.post("/", response_model=DepartmentOut)
async def create_department(payload: DepartmentCreate, _=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    # Verify faculty exists
    faculty = (await db.execute(select(Faculty).where(Faculty.id == payload.faculty_id))).scalar_one_or_none()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Check if name exists in this faculty? (Prefer unique overall for simplicity)
    exist = (await db.execute(select(Department).where(Department.name == payload.name))).scalar_one_or_none()
    if exist:
        raise HTTPException(status_code=409, detail=f"Department '{payload.name}' already exists.")
    
    department = Department(**payload.model_dump())
    db.add(department)
    await db.flush()
    await db.refresh(department)
    return department

@router.get("/", response_model=list[DepartmentOut])
async def list_departments(
    faculty_id: int = None, 
    db: AsyncSession = Depends(get_db)
):
    """Publicly accessible for registration."""
    query = select(Department)
    if faculty_id:
        query = query.where(Department.faculty_id == faculty_id)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{department_id}", response_model=DepartmentOut)
async def get_department(department_id: int, db: AsyncSession = Depends(get_db)):
    dept = (await db.execute(select(Department).where(Department.id == department_id))).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept

@router.put("/{department_id}", response_model=DepartmentOut)
async def update_department(department_id: int, payload: DepartmentUpdate, _=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    dept = (await db.execute(select(Department).where(Department.id == department_id))).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if payload.faculty_id:
        faculty = (await db.execute(select(Faculty).where(Faculty.id == payload.faculty_id))).scalar_one_or_none()
        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty not found")
        dept.faculty_id = payload.faculty_id

    if payload.name: dept.name = payload.name
    if payload.description is not None: dept.description = payload.description
    
    await db.flush()
    await db.refresh(dept)
    return dept

@router.delete("/{department_id}", status_code=204)
async def delete_department(department_id: int, _=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    dept = (await db.execute(select(Department).where(Department.id == department_id))).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    await db.delete(dept)
    await db.commit()

@router.get("/{department_id}/curriculum")
async def get_department_curriculum(department_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns the curriculum grid for a specific department:
    { total_years, semesters_per_year, years: { 1: { 1: [courses], 2: [courses] }, ... } }
    """
    dept = (await db.execute(select(Department).where(Department.id == department_id))).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    faculty = (await db.execute(select(Faculty).where(Faculty.id == dept.faculty_id))).scalar_one_or_none()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found for this department")

    # Get all courses in THIS department
    course_result = await db.execute(
        select(Course).where(Course.department_id == department_id).order_by(Course.academic_year, Course.semester, Course.course_code)
    )
    courses = course_result.scalars().all()

    # Build grid: year -> semester -> [courses]
    years = {}
    for y in range(1, faculty.total_years + 1):
        years[y] = {}
        for s in range(1, faculty.semesters_per_year + 1):
            years[y][s] = []

    for c in courses:
        if c.academic_year and c.semester:
            year_key = c.academic_year
            sem_key = c.semester
            if year_key in years and sem_key in years.get(year_key, {}):
                years[year_key][sem_key].append({
                    "id": c.id,
                    "name": c.name,
                    "course_code": c.course_code,
                    "credits": c.credits,
                    "passing_score": c.passing_score,
                    "is_elective": c.is_elective,
                    "tier_level": c.tier_level,
                    "parent_course_id": c.parent_course_id,
                    "doctor_id": c.doctor_id,
                    "instructor_id": c.instructor_id,
                })

    return {
        "department_id": dept.id,
        "department_name": dept.name,
        "total_years": faculty.total_years,
        "semesters_per_year": faculty.semesters_per_year,
        "years": years,
        "total_courses": len(courses),
    }
