from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.faculty import Faculty
from app.models.department import Department
from app.models.course import Course
from app.schemas.schemas import FacultyCreate, FacultyUpdate, FacultyOut
from app.core.security import require_admin, require_any
from app.services.scoping import get_scoped_faculty_ids

router = APIRouter(prefix="/faculties", tags=["Faculties"])

@router.post("/", response_model=FacultyOut)
async def create_faculty(payload: FacultyCreate, _=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    # Check if name exists
    exist = (await db.execute(select(Faculty).where(Faculty.name == payload.name))).scalar_one_or_none()
    if exist:
        raise HTTPException(status_code=409, detail=f"Faculty '{payload.name}' already exists.")
    
    faculty = Faculty(**payload.model_dump())
    db.add(faculty)
    await db.flush()
    await db.refresh(faculty)
    return faculty

@router.get("/", response_model=list[FacultyOut])
async def list_faculties(db: AsyncSession = Depends(get_db)):
    """Publicly accessible for registration."""
    query = select(Faculty)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{faculty_id}", response_model=FacultyOut)
async def get_faculty(faculty_id: int, db: AsyncSession = Depends(get_db)):
    faculty = (await db.execute(select(Faculty).where(Faculty.id == faculty_id))).scalar_one_or_none()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return faculty

@router.put("/{faculty_id}", response_model=FacultyOut)
async def update_faculty(faculty_id: int, payload: FacultyUpdate, _=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    faculty = (await db.execute(select(Faculty).where(Faculty.id == faculty_id))).scalar_one_or_none()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(faculty, key, value)
    
    await db.flush()
    await db.refresh(faculty)
    return faculty

@router.delete("/{faculty_id}", status_code=204)
async def delete_faculty(faculty_id: int, _=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    faculty = (await db.execute(select(Faculty).where(Faculty.id == faculty_id))).scalar_one_or_none()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    await db.delete(faculty)
    await db.commit()


@router.get("/{faculty_id}/curriculum")
async def get_faculty_curriculum(faculty_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns the full curriculum grid for a faculty:
    { total_years, semesters_per_year, years: { 1: { 1: [courses], 2: [courses] }, ... } }
    """
    faculty = (await db.execute(select(Faculty).where(Faculty.id == faculty_id))).scalar_one_or_none()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Get all departments in this faculty
    dept_result = await db.execute(select(Department).where(Department.faculty_id == faculty_id))
    departments = dept_result.scalars().all()
    dept_ids = [d.id for d in departments]

    # Get all courses in those departments
    courses = []
    if dept_ids:
        course_result = await db.execute(
            select(Course).where(Course.department_id.in_(dept_ids)).order_by(Course.academic_year, Course.semester, Course.course_code)
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
        "faculty_id": faculty.id,
        "faculty_name": faculty.name,
        "total_years": faculty.total_years,
        "semesters_per_year": faculty.semesters_per_year,
        "departments": [{"id": d.id, "name": d.name} for d in departments],
        "years": years,
        "total_courses": len(courses),
    }
