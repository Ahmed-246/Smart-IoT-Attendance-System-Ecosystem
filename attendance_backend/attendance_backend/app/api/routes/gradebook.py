from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import csv
import io

from app.db.database import get_db
from app.models.assessment import Assessment
from app.models.grade_result import GradeResult
from app.schemas.grade_result import GradeResultOut, GradeBulkCommit
from app.core.security import require_doctor

router = APIRouter(prefix="/gradebook", tags=["Gradebook"])


@router.get("/{assessment_id}", response_model=List[GradeResultOut])
async def get_gradebook(
    assessment_id: int,
    current_user=Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(GradeResult).where(GradeResult.assessment_id == assessment_id))
    return result.scalars().all()


@router.patch("/{assessment_id}/commit", response_model=dict)
async def commit_grades(
    assessment_id: int,
    payload: GradeBulkCommit,
    current_user=Depends(require_doctor), # Doctor
    db: AsyncSession = Depends(get_db)
):
    ass_q = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = ass_q.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Fetch existing grades
    res = await db.execute(select(GradeResult).where(GradeResult.assessment_id == assessment_id))
    existing_grades = {g.student_id: g for g in res.scalars().all()}

    updated_count = 0
    added_count = 0

    for upd in payload.grades:
        # Check if already exists
        if upd.student_id in existing_grades:
            gr = existing_grades[upd.student_id]
            gr.raw_score = upd.raw_score
            gr.instructor_remarks = upd.instructor_remarks
            gr.is_flagged = upd.is_flagged
            gr.is_absent = upd.is_absent
            updated_count += 1
        else:
            new_gr = GradeResult(
                assessment_id=assessment_id,
                student_id=upd.student_id,
                raw_score=upd.raw_score,
                instructor_remarks=upd.instructor_remarks,
                is_flagged=upd.is_flagged,
                is_absent=upd.is_absent,
                created_by_doctor_id=current_user.get("doctor_id")
            )
            db.add(new_gr)
            added_count += 1

    # Update Instructor if provided (deferred assignment)
    if payload.instructor_id is not None:
        assessment.instructor_id = payload.instructor_id

    # Mark as Finished only if finalized
    if payload.finalize:
        assessment.status = "Finished" # Marks as finalized and "notifies" students
    
    await db.commit()
    # Mocking Student Notification logic implicitly triggered here
    finish_msg = "committed and finalized" if payload.finalize else "saved as draft"
    return {"message": f"Grades {finish_msg} successfully.", "added": added_count, "updated": updated_count}


@router.post("/upload")
async def upload_csv(
    assessment_id: int,
    file: UploadFile = File(...),
    current_user=Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    ass_q = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = ass_q.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    content = await file.read()
    text = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(text))

    res = await db.execute(select(GradeResult).where(GradeResult.assessment_id == assessment_id))
    existing_grades = {g.student_id: g for g in res.scalars().all()}

    added = 0
    updated = 0

    # Expected headers: student_id, raw_score, instructor_remarks
    for row in reader:
        if not row.get("student_id") or not row.get("raw_score"):
            continue
        try:
            sid = int(row["student_id"])
            raw = float(row["raw_score"])
            remarks = row.get("instructor_remarks", "")
            
            if sid in existing_grades:
                gr = existing_grades[sid]
                gr.raw_score = raw
                gr.instructor_remarks = remarks
                updated += 1
            else:
                db.add(GradeResult(
                    assessment_id=assessment_id,
                    student_id=sid,
                    raw_score=raw,
                    instructor_remarks=remarks,
                    is_flagged=False,
                    created_by_doctor_id=current_user.get("doctor_id")
                ))
                added += 1
        except ValueError:
            continue

    await db.commit()
    return {"message": "CSV processed successfully", "added": added, "updated": updated}
