from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime, timezone
import csv
import io

from app.db.database import get_db
from app.models.session import Session
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment
from app.models.attendance import Attendance
from app.schemas.schemas import SessionCreate, SessionOut
from app.core.security import require_engineer, get_current_user
from app.services.scoping import get_scoped_department_ids

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("/", response_model=SessionOut)
async def create_session(
    payload: SessionCreate,
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Session).where(
            Session.course_id == payload.course_id,
            Session.is_active == True,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An active session already exists for this course")

    session = Session(**payload.model_dump())
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


from app.models.instructor import Instructor
from app.models.doctor import Doctor
from sqlalchemy.orm import selectinload

@router.get("/active", response_model=list[SessionOut])
async def get_active_sessions(
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role")
    query = select(Session).where(Session.is_active == True)
    
    if role in ["engineer", "doctor"]:
        dept_ids = await get_scoped_department_ids(current_user, db)
        if dept_ids:
            query = query.join(Course, Course.id == Session.course_id).where(Course.department_id.in_(dept_ids))
        else:
            query = query.where(False)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/my", response_model=list[SessionOut])
async def get_my_sessions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Student endpoint: returns active sessions for the student's enrolled courses."""
    email = current_user.get("sub")
    student_result = await db.execute(select(Student).where(Student.email == email))
    student = student_result.scalar_one_or_none()

    if not student:
        return []

    # Get enrolled course IDs
    enroll_result = await db.execute(
        select(Enrollment.course_id).where(Enrollment.student_id == student.id)
    )
    course_ids = [row[0] for row in enroll_result.all()]

    if not course_ids:
        return []

    result = await db.execute(
        select(Session).where(
            Session.course_id.in_(course_ids),
            Session.is_active == True,
        )
    )
    return result.scalars().all()


@router.get("/all", response_model=list[SessionOut])
async def get_all_sessions(
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role")
    query = select(Session)
    
    if role in ["engineer", "doctor"]:
        dept_ids = await get_scoped_department_ids(current_user, db)
        if dept_ids:
            query = query.join(Course, Course.id == Session.course_id).where(Course.department_id.in_(dept_ids))
        else:
            query = query.where(False)

    result = await db.execute(query.order_by(Session.id.desc()).limit(100))
    return result.scalars().all()


@router.patch("/{session_id}/close", response_model=SessionOut)
async def close_session(
    session_id: int,
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_active = False
    session.end_time = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/instructor", response_model=list[SessionOut])
async def get_instructor_sessions(
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).order_by(Session.id.desc()))
    return result.scalars().all()


# ═══════════════════════════════════════════════════════════════════════════════
#  SESSION HISTORY (ended sessions with search)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/history", response_model=list[SessionOut])
async def get_session_history(
    q: str = Query(default="", description="Search by course name or session ID"),
    date_from: str = Query(default="", description="Filter from date (YYYY-MM-DD)"),
    date_to: str = Query(default="", description="Filter to date (YYYY-MM-DD)"),
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    """Get ended sessions with optional search and date filtering."""
    role = current_user.get("role")
    query = select(Session).where(Session.is_active == False)
    
    # Scoping for engineer/doctor
    joined_course = False
    if role in ["engineer", "doctor"]:
        dept_ids = await get_scoped_department_ids(current_user, db)
        if dept_ids:
            query = query.join(Course, Course.id == Session.course_id).where(Course.department_id.in_(dept_ids))
            joined_course = True
        else:
            query = query.where(False)

    # If searching by query text, join with course for name matching
    if q:
        # Try to parse as session ID
        try:
            sid = int(q.replace("#", ""))
            query = query.where(Session.id == sid)
        except ValueError:
            # Search by course name
            if not joined_course:
                query = query.join(Course, Course.id == Session.course_id)
            query = query.where(Course.name.ilike(f"%{q}%"))

    # Date filters
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.where(Session.start_time >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            query = query.where(Session.start_time <= dt_to)
        except ValueError:
            pass

    query = query.order_by(Session.end_time.desc()).limit(100)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/history/export")
async def export_session_history(
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    """Export all ended sessions and their attendance records as CSV."""
    # Get ended sessions
    sessions_result = await db.execute(
        select(Session, Course)
        .join(Course, Course.id == Session.course_id)
        .where(Session.is_active == False)
        .order_by(Session.end_time.desc())
    )
    session_rows = sessions_result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Session ID", "Course", "Start Time", "End Time",
        "Student ID", "Student Name", "RFID", "Status", "Scan Time"
    ])

    for sess, course in session_rows:
        # Get attendance + student info for this session
        att_result = await db.execute(
            select(Attendance, Student)
            .join(Student, Student.id == Attendance.student_id)
            .where(Attendance.session_id == sess.id)
        )
        att_rows = att_result.all()

        if att_rows:
            for att, student in att_rows:
                writer.writerow([
                    sess.id,
                    course.name,
                    sess.start_time.isoformat() if sess.start_time else "",
                    sess.end_time.isoformat() if sess.end_time else "",
                    student.id,
                    student.name,
                    student.rfid_uid,
                    att.status,
                    att.timestamp.isoformat() if att.timestamp else "",
                ])
        else:
            writer.writerow([
                sess.id, course.name,
                sess.start_time.isoformat() if sess.start_time else "",
                sess.end_time.isoformat() if sess.end_time else "",
                "", "", "", "", "",
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=session_history.csv"},
    )
