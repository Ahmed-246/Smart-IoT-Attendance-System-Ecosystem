from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from app.db.database import get_db
from app.models.student import Student
from app.models.session import Session
from app.models.enrollment import Enrollment
from app.models.attendance import Attendance
from app.models.device import Device
from app.schemas.schemas import ScanRequest, ScanResponse, AttendanceOut
from app.core.security import get_current_user, require_engineer, require_admin, require_any
from app.services.rfid_discovery import rfid_discovery

router = APIRouter(prefix="/attendance", tags=["Attendance"])


async def verify_device(x_device_key: str = Header(...), db: AsyncSession = Depends(get_db)):
    print(f"[DEBUG] Received Device Key: '{x_device_key}'")
    result = await db.execute(select(Device).where(Device.api_key == x_device_key))
    device = result.scalar_one_or_none()
    if not device:
        print(f"[AUTH_FAIL] Invalid key: {x_device_key}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="INVALID_DEVICE_KEY")
    
    # Update last_seen (Naive UTC to avoid asyncpg DataError)
    device.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
    
    return device


@router.get("/heartbeat")
async def device_heartbeat(device = Depends(verify_device)):
    return {"status": "ok", "message": "Heartbeat received", "device_id": device.id}


@router.post("/scan", response_model=ScanResponse)
async def scan_rfid(
    payload: ScanRequest,
    device=Depends(verify_device),
    db: AsyncSession = Depends(get_db),
):
    # ──── RFID DISCOVERY ATTEMPT ────
    # Always try to capture UID if a discovery session is active, even for known students
    rfid_discovery.capture_uid(payload.rfid_uid)
    
    # Find student by RFID
    result = await db.execute(select(Student).where(Student.rfid_uid == payload.rfid_uid))
    student = result.scalar_one_or_none()
    
    if not student:
        raise HTTPException(status_code=404, detail="STUDENT_NOT_FOUND")

    # ──── BLACKLIST CHECK ────
    if student.is_blacklisted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Student '{student.name}' is blacklisted. Reason: {student.blacklist_reason or 'No reason provided'}"
        )

    # Find enrolled course IDs for this student
    enroll_result = await db.execute(
        select(Enrollment.course_id).where(Enrollment.student_id == student.id)
    )
    enrolled_course_ids = [row[0] for row in enroll_result.all()]

    if not enrolled_course_ids:
        raise HTTPException(status_code=400, detail="STUDENT_NOT_ENROLLED")

    # Find active session for any of the student's enrolled courses
    result = await db.execute(
        select(Session).where(
            Session.course_id.in_(enrolled_course_ids),
            Session.is_active == True,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=400, detail="NO_ACTIVE_SESSION")

    # Record attendance (duplicate blocked by DB unique constraint)
    record = Attendance(
        student_id=student.id,
        session_id=session.id,
        instructor_id=session.instructor_id,
        status="present",
    )
    db.add(record)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Student already scanned for this session")

    return ScanResponse(
        status="success",
        student=student.name,
        session=f"Session #{session.id} — Course #{session.course_id}",
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/student/{student_id}", response_model=list[AttendanceOut])
async def get_student_attendance(
    student_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attendance).where(Attendance.student_id == student_id)
    )
    return result.scalars().all()


@router.get("/session/{session_id}", response_model=list[AttendanceOut])
async def get_session_attendance(
    session_id: int,
    current_user=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attendance).where(Attendance.session_id == session_id)
    )
    return result.scalars().all()


# ── RFID Discovery Endpoints (Unlocked) ──────────────────────────────────────

@router.post("/discovery/start")
async def start_discovery():
    """Starts a discovery session and returns a token."""
    token = rfid_discovery.start_session()
    return {"token": token, "expires_in": 300}


@router.get("/discovery/check")
async def check_discovery(token: str, db: AsyncSession = Depends(get_db)):
    """Checks if a UID has been captured and looks up student info."""
    uid = rfid_discovery.check_session(token)
    if not uid:
        return {"status": "pending", "uid": None}
    
    # Check if student exists
    result = await db.execute(select(Student).where(Student.rfid_uid == uid))
    student = result.scalar_one_or_none()
    
    if student:
        return {
            "status": "exists", 
            "uid": uid, 
            "student": {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "university_id": student.university_id
            }
        }
        
    return {"status": "captured", "uid": uid}
