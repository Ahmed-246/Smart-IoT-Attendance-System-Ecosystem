from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.course import Course
from app.models.assessment import Assessment
from app.models.instructor import Instructor
from app.schemas.assessment import AssessmentCreate, AssessmentUpdate, AssessmentOut, AssessmentStatusUpdate
from app.core.security import require_admin, require_engineer
from app.services.scoping import get_scoped_department_ids

router = APIRouter(prefix="/assessments", tags=["Assessments"])


@router.get("/", response_model=List[AssessmentOut])
async def get_assessments(
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db)
):
    role = current_user.get("role")
    query = (
        select(Assessment, Instructor.name.label("instructor_name"))
        .outerjoin(Instructor, Instructor.id == Assessment.instructor_id)
    )
    
    if role in ["engineer", "doctor"]:
        dept_ids = await get_scoped_department_ids(current_user, db)
        if dept_ids:
            query = query.join(Course, Course.id == Assessment.course_code).where(Course.department_id.in_(dept_ids))
        else:
            query = query.where(False)
            
    query = query.order_by(Assessment.id.desc())
    result = await db.execute(query)
    final = []
    for row in result:
        ass = row[0]
        ass.instructor_name = row.instructor_name
        final.append(ass)
    return final


@router.get("/{assessment_id}", response_model=AssessmentOut)
async def get_assessment(
    assessment_id: int,
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Assessment, Instructor.name.label("instructor_name"))
        .outerjoin(Instructor, Instructor.id == Assessment.instructor_id)
        .where(Assessment.id == assessment_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    ass = row[0]
    ass.instructor_name = row.instructor_name
    return ass


@router.post("/", response_model=AssessmentOut)
async def create_assessment(
    payload: AssessmentCreate,
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db)
):
    role = current_user.get("role")
    if role == "engineer" and payload.assessment_type in ["Midterm", "Final"]:
        raise HTTPException(status_code=403, detail="Engineers cannot create Midterm or Final exams.")

    # Fetch Course to get max_score for auto-calculating weight
    course = await db.scalar(select(Course).where(Course.id == payload.course_code))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Auto-Calculate Weight
    weight_computed = 0.0
    if course.max_score > 0:
        weight_computed = round((payload.max_score / course.max_score) * 100, 2)

    # Initialize model
    data = payload.model_dump()
    # Ensure UI-sent empty string or null isn't interpreted wrong
    if not data.get("scheduled_date"):
        data["scheduled_date"] = None
        
    # Default instructor to course instructor if not set
    if not data.get("instructor_id") and course.instructor_id:
        data["instructor_id"] = course.instructor_id

    assessment = Assessment(**data)
    assessment.weight_pct = weight_computed

    db.add(assessment)
    await db.flush()
    await db.refresh(assessment)
    return assessment

@router.patch("/{assessment_id}/status", response_model=AssessmentOut)
async def update_status(
    assessment_id: int,
    payload: AssessmentStatusUpdate,
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    assessment.status = payload.status
    await db.flush()
    await db.refresh(assessment)
    return assessment

@router.put("/{assessment_id}", response_model=AssessmentOut)
async def update_assessment(
    assessment_id: int,
    payload: AssessmentUpdate,
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    role = current_user.get("role")
    if role == "engineer":
        if assessment.assessment_type in ["Midterm", "Final"]:
             raise HTTPException(status_code=403, detail="Engineers cannot modify Midterm or Final exams.")
        if payload.assessment_type in ["Midterm", "Final"]:
             raise HTTPException(status_code=403, detail="Engineers cannot convert an assessment to a Midterm or Final exam.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(assessment, k, v)

    course = await db.scalar(select(Course).where(Course.id == assessment.course_code))
    if course and course.max_score > 0:
        assessment.weight_pct = round((assessment.max_score / course.max_score) * 100, 2)

    await db.commit()
    await db.refresh(assessment)
    return assessment

@router.delete("/{assessment_id}")
async def delete_assessment(
    assessment_id: int,
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    role = current_user.get("role")
    if role == "engineer" and assessment.assessment_type in ["Midterm", "Final"]:
        raise HTTPException(status_code=403, detail="Engineers cannot delete Midterm or Final exams.")

    await db.delete(assessment)
    await db.commit()
    return {"message": "Deleted successfully"}
