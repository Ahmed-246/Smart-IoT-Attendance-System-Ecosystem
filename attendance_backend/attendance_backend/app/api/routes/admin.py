from typing import List
import secrets
import os
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Response
from fastapi.responses import StreamingResponse
import csv
import io
from sqlalchemy import select, func, delete, insert, update
from sqlalchemy.orm import selectinload, aliased
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.student import Student, ApprovalStatus, AcademicStatus
from app.models.pre_verified import PreVerifiedStudent
from app.models.instructor import Instructor
from app.models.doctor import Doctor
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.grade import Grade
from app.models.grade_result import GradeResult
from app.models.assessment import Assessment, AssessmentType
from app.models.session import Session
from app.models.attendance import Attendance
from app.models.device import Device
from app.models.faculty import Faculty
from app.models.department import Department
from app.models.term_config import TermConfig
from app.models.permission import UserCapability
from app.services.automation import enroll_student_in_department_courses
from app.services.academic import calculate_attendance_percentage, calculate_course_final
from app.services.scoping import get_scoped_department_ids, get_scoped_faculty_ids
from app.services.sync_service import sync_profile_to_user, sync_user_to_profile, ensure_profile_exists
from app.schemas.schemas import (
    UserCreate, UserUpdate, UserOut,
    StudentCreate, StudentUpdate, StudentOut, StudentProfileOut, BlacklistRequest,
    PreVerifiedStudentCreate, PreVerifiedStudentOut, ApprovalUpdate, RejectionRequest,
    InstructorCreate, InstructorUpdate, InstructorOut, InstructorProfileOut,
    DoctorCreate, DoctorUpdate, DoctorOut, DoctorProfileOut,
    CourseCreate, CourseUpdate, CourseOut, CourseDetailOut,
    EnrollmentCreate, EnrollmentOut,
    GradeCreate, GradeOut,
    DeviceCreate, DeviceUpdate, DeviceOut,
    AttendanceReport, AttendanceOut,
    GlobalStatsOut, ActivityFeedItem
)
from app.core.security import hash_password, require_admin, require_engineer, require_any, get_current_user, require_capability_or_super_admin
from app.services.activity_logger import log_activity
from app.models.activity import ActivityAction, ActivityPriority

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Security Dependencies ──────────────────────────────────────────────────

async def get_current_user_with_doctor_check(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_any)  # Get basic user payload from JWT
):
    """
    Extensions of require_engineer to verify if the user is 
    specifically a Doctor (role instructor + email in doctors table).
    """
    role = user_payload.get("role")
    email = user_payload.get("sub")
    
    if role == UserRole.admin:
        return user_payload
    
    if role in [UserRole.engineer, UserRole.doctor]:
        # Check if email is in the Doctor table
        res = await db.execute(select(Doctor).where(Doctor.email == email))
        if res.scalar_one_or_none():
            return user_payload

    raise HTTPException(
        status_code=403, 
        detail="Permission denied. This action requires Admin or Doctor status."
    )

require_admin_or_doctor = get_current_user_with_doctor_check

def get_model_snapshot(obj):
    """Captures a serializable snapshot of essential model fields, excluding sensitive data."""
    if not obj: return {}
    data = {}
    for column in obj.__table__.columns:
        if column.name in ["password_hash", "academic_password_hash"]:
            continue
        val = getattr(obj, column.name)
        if isinstance(val, (datetime, timedelta)):
            data[column.name] = val.isoformat()
        elif hasattr(val, 'value'): # Handle Enum
            data[column.name] = val.value
        else:
            data[column.name] = val
    return data


# ─── Admin Self-Profile ─────────────────────────────────────────────────────

@router.get("/me/profile")
async def get_admin_profile(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get the logged-in admin/super_admin's profile with system-wide stats."""
    email = current_user.get("sub")
    user_id = current_user.get("user_id")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Aggregate system stats in parallel
    total_students = (await db.execute(select(func.count(Student.id)))).scalar() or 0
    total_courses = (await db.execute(select(func.count(Course.id)))).scalar() or 0
    total_faculties = (await db.execute(select(func.count(Faculty.id)))).scalar() or 0
    total_departments = (await db.execute(select(func.count(Department.id)))).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_devices = (await db.execute(select(func.count(Device.id)))).scalar() or 0
    total_sessions = (await db.execute(select(func.count(Session.id)))).scalar() or 0
    total_assessments = (await db.execute(select(func.count(Assessment.id)))).scalar() or 0
    total_instructors = (await db.execute(select(func.count(Instructor.id)))).scalar() or 0
    total_doctors = (await db.execute(select(func.count(Doctor.id)))).scalar() or 0
    total_enrollments = (await db.execute(select(func.count(Enrollment.id)))).scalar() or 0

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone_number": user.phone_number,
            "role": user.role.value,
            "last_login": user.last_login,
            "profile_image_url": user.profile_image_url,
            "has_academic_password": bool(user.academic_password_hash),
            "password_changed_at": user.password_changed_at,
            "capabilities": [c.capability_name for c in (await db.execute(
                select(UserCapability.capability_name)
                .where(UserCapability.user_id == user.id)
                .where((UserCapability.expires_at == None) | (UserCapability.expires_at > datetime.now(timezone.utc)))
            )).all()],
        },
        "stats": {
            "total_students": total_students,
            "total_courses": total_courses,
            "total_faculties": total_faculties,
            "total_departments": total_departments,
            "total_users": total_users,
            "total_devices": total_devices,
            "total_sessions": total_sessions,
            "total_assessments": total_assessments,
            "total_instructors": total_instructors,
            "total_doctors": total_doctors,
            "total_enrollments": total_enrollments,
        },
        "assigned_department_ids": await get_scoped_department_ids(current_user, db),
        "assigned_faculty_ids": await get_scoped_faculty_ids(current_user, db),
    }

# ─── Command Center Telemetry (Super Admin Only) ──────────────────────────

@router.get("/dashboard/global", response_model=GlobalStatsOut)
async def get_global_dashboard_stats(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin only.")

    # 1. Academic Totals
    total_students = (await db.execute(select(func.count(Student.id)))).scalar() or 0
    total_faculties = (await db.execute(select(func.count(Faculty.id)))).scalar() or 0
    total_departments = (await db.execute(select(func.count(Department.id)))).scalar() or 0
    total_courses = (await db.execute(select(func.count(Course.id)))).scalar() or 0

    # 2. Scanner Health
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    five_mins_ago = now - timedelta(minutes=5)
    
    total_scanners = (await db.execute(select(func.count(Device.id)))).scalar() or 0
    active_scanners = (await db.execute(select(func.count(Device.id)).where(Device.last_seen >= five_mins_ago))).scalar() or 0
    
    uptime = (active_scanners / total_scanners * 100) if total_scanners > 0 else 100.0
    alerts = total_scanners - active_scanners

    # 3. Simple Trend (Students added in last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    # Note: If student model doesn't have created_at, we might need to add it or approximate.
    # For now, let's assume a static +2.5% for visual demo if no created_at exists.
    trend = 2.5 

    return {
        "total_students": total_students,
        "student_trend": trend,
        "active_scanners": active_scanners,
        "total_scanners": total_scanners,
        "uptime_pct": round(uptime, 1),
        "alerts_count": alerts,
        "total_faculties": total_faculties,
        "total_departments": total_departments,
        "total_courses": total_courses
    }

@router.get("/dashboard/activity", response_model=List[ActivityFeedItem])
async def get_activity_feed(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Unified feed of system events for the Command Center."""
    feed = []
    
    # 1. Recent Scans (Top 10)
    scans = await db.execute(
        select(Attendance, Student)
        .join(Student, Student.id == Attendance.student_id)
        .order_by(Attendance.timestamp.desc())
        .limit(10)
    )
    for att, stu in scans.all():
        feed.append(ActivityFeedItem(
            id=f"scan_{att.id}",
            type="scan",
            title=f"{stu.name} scanned in",
            subtitle=f"Session #{att.session_id}",
            timestamp=att.timestamp,
            icon_type="check"
        ))

    # 2. Scanner Alerts (Simulate if heartbeat fails)
    five_mins_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=5)
    offline_devs = await db.execute(select(Device).where(Device.last_seen < five_mins_ago).limit(3))
    for dev in offline_devs.scalars().all():
        feed.append(ActivityFeedItem(
            id=f"alert_{dev.id}",
            type="alert",
            title="Scanner Offline",
            subtitle=f"Location: {dev.location or 'Unknown'}",
            timestamp=dev.last_seen or datetime.now(),
            icon_type="error"
        ))

    # Sort by time
    feed.sort(key=lambda x: x.timestamp, reverse=True)
    return feed


# ─── System Branding & Config ────────────────────────────────────────────────

@router.post("/system/logo")
async def upload_system_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin only: Upload a system-wide logo.
    Replaces the branding logo used across the dashboard and login page.
    """
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can update system branding.")
    
    # Normalize filename and save to branding folder
    os.makedirs("uploads/branding", exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"system_logo{file_ext}"
    file_path = f"uploads/branding/{filename}"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    url_path = f"/{file_path}"
    
    # Update TermConfig (Singleton id=1)
    result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
    config = result.scalar_one_or_none()
    
    if not config:
        # If no config yet, create one
        config = TermConfig(id=1, system_logo_url=url_path)
        db.add(config)
    else:
        config.system_logo_url = url_path
        
    await db.commit()
    return {"message": "System logo updated successfully", "system_logo_url": url_path}

@router.get("/term/config")
async def get_term_config(current_user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
    config = result.scalar_one_or_none()
    if not config:
        return {
            "id": 1,
            "term_name": "Current Term",
            "exam_weight": 60.0,
            "coursework_weight": 40.0,
            "system_logo_url": None
        }
    return {
        "id": config.id,
        "term_name": config.academic_year_label or "Current Term",
        "exam_weight": config.exam_weight if hasattr(config, 'exam_weight') and config.exam_weight else 60.0,
        "coursework_weight": config.coursework_weight if hasattr(config, 'coursework_weight') and config.coursework_weight else 40.0,
        "system_logo_url": config.system_logo_url
    }

@router.patch("/term/config")
async def update_term_config(payload: dict, current_user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin only.")
        
    result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
    config = result.scalar_one_or_none()
    if not config:
        config = TermConfig(id=1)
        db.add(config)
        
    exam_weight = payload.get("exam_weight")
    coursework_weight = payload.get("coursework_weight")
    
    if exam_weight is not None:
        if not hasattr(config, 'exam_weight'):
             config._exam_weight = exam_weight 
        else:
             config.exam_weight = exam_weight

    if coursework_weight is not None:
        if not hasattr(config, 'coursework_weight'):
             config._coursework_weight = coursework_weight
        else:
             config.coursework_weight = coursework_weight
             
    await db.commit()
    
    # Reload to return full payload
    result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
    config = result.scalar_one_or_none()
    
    return {
        "id": config.id,
        "term_name": config.academic_year_label or "Current Term",
        "exam_weight": config.exam_weight if hasattr(config, 'exam_weight') and config.exam_weight else 60.0,
        "coursework_weight": config.coursework_weight if hasattr(config, 'coursework_weight') and config.coursework_weight else 40.0,
        "system_logo_url": config.system_logo_url
    }

# ═══════════════════════════════════════════════════════════════════════════════
#  USERS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/users", response_model=UserOut)
async def create_user(
    payload: UserCreate,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if payload.role == UserRole.super_admin and current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can assign the Super Admin role.")

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        password_changed_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    if payload.academic_password:
        user.academic_password_hash = hash_password(payload.academic_password)
    db.add(user)
    await db.flush()
    
    # Log user creation
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.CREATE,
        description=f"Created new user account: {payload.email} (Role: {payload.role})",
        priority=ActivityPriority.CAUTION,
        target_model="User",
        target_id=str(user.id)
    )

    await db.refresh(user)
    await db.commit()
    return user


@router.get("/users", response_model=list[UserOut])
async def list_users(_=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    caller_role = current_user.get("role")

    # Capture state before update
    before_state = get_model_snapshot(user)
    prev_role = user.role

    # Prevent non-super-admins from modifying super_admin accounts
    if user.role == UserRole.super_admin and caller_role != "super_admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can modify Super Admin accounts.")

    # Role Transition Validation
    if payload.role and payload.role != prev_role:
        # 1. Prevent non-super-admins from assigning super_admin role
        if payload.role == UserRole.super_admin and caller_role != "super_admin":
            raise HTTPException(status_code=403, detail="Only a Super Admin can assign the Super Admin role.")

        # 2. Students are permanent
        if prev_role == UserRole.student:
            raise HTTPException(status_code=403, detail="Student roles are permanent and cannot be changed to staff roles.")
            
        # 3. Super Admins cannot be demoted
        if prev_role == UserRole.super_admin:
            raise HTTPException(status_code=403, detail="Super Admins cannot be demoted to other roles.")

        # 4. Engineers can only stay engineers or become doctors
        if prev_role == UserRole.engineer:
            if payload.role != UserRole.doctor:
                raise HTTPException(status_code=403, detail="Engineers can only be promoted to Doctor or stay Engineers.")

        # 5. Doctors and Admins can only be changed by Super Admin (usually to Super Admin)
        if prev_role in [UserRole.doctor, UserRole.admin]:
            if caller_role != "super_admin":
                raise HTTPException(status_code=403, detail="Only a Super Admin can change the role of a Doctor or Admin.")
            
            # Additional rule: Doctors never become engineers or students
            if prev_role == UserRole.doctor and payload.role in [UserRole.engineer, UserRole.student]:
                raise HTTPException(status_code=403, detail="Doctors cannot be demoted to Engineer or Student roles.")
            
            # Additional rule: Admins can only become Super Admin
            if prev_role == UserRole.admin and payload.role not in [UserRole.admin, UserRole.super_admin]:
                raise HTTPException(status_code=403, detail="Admins can only be promoted to Super Admin.")

        # --- Handle Old Profile Cleanup to prevent duplication ---
        # If we reached here, the role change is allowed.
        if prev_role == UserRole.engineer:
            res = await db.execute(select(Instructor).where(Instructor.email == user.email))
            old_profile = res.scalar_one_or_none()
            if old_profile: await db.delete(old_profile)
        elif prev_role == UserRole.doctor:
            res = await db.execute(select(Doctor).where(Doctor.email == user.email))
            old_profile = res.scalar_one_or_none()
            if old_profile: await db.delete(old_profile)
        elif prev_role == UserRole.admin:
            # Admins usually don't have specialized profiles unless they were something else before
            pass
        
        # Flush deletions before potentially adding new ones in ensure_profile_exists
        await db.flush()
    
    update_data = payload.model_dump(exclude_unset=True)
    
    # Handle password hashing separately
    if "password" in update_data:
        user.password_hash = hash_password(update_data.pop("password"))
        user.password_changed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    if "academic_password" in update_data:
        user.academic_password_hash = hash_password(update_data.pop("academic_password"))

    # Apply remaining fields dynamically
    for key, value in update_data.items():
        setattr(user, key, value)

    await db.flush()
    # 1. Ensure profile exists if role was set
    await ensure_profile_exists(db, user)
    # 2. Propagate changes (name, email, phone) to profile
    await sync_user_to_profile(db, user.id)
    
    await db.refresh(user)
    
    # Capture state after update
    after_state = get_model_snapshot(user)
    
    # Compute diff
    diff = {}
    for key in after_state:
        if before_state.get(key) != after_state.get(key):
            diff[key] = {
                "before": before_state.get(key),
                "after": after_state.get(key)
            }

    # Log user update
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.UPDATE,
        description=f"Updated user account: {user.email}",
        # User edits are now always SIGNIFICANT (WARNING) as per request
        priority=ActivityPriority.WARNING,
        target_model="User",
        target_id=str(user.id),
        details={
            "updates": list(update_data.keys()),
            "diff": diff,
            "status": "success"
        }
    )

    await db.refresh(user)
    await db.commit()
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent non-super-admins from deleting super_admin accounts
    if user.role == UserRole.super_admin and current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can delete Super Admin accounts.")

    # Cascading deletion to specialized profiles using ORM to trigger delete-orphan cascades
    if user.role == UserRole.student:
        res = await db.execute(select(Student).where(Student.email == user.email))
        student = res.scalar_one_or_none()
        if student:
            await db.delete(student)
    elif user.role == UserRole.engineer:
        res = await db.execute(select(Instructor).where(Instructor.email == user.email))
        instructor = res.scalar_one_or_none()
        if instructor:
            await db.delete(instructor)
    elif user.role == UserRole.doctor:
        res = await db.execute(select(Doctor).where(Doctor.email == user.email))
        doctor = res.scalar_one_or_none()
        if doctor:
            await db.delete(doctor)

    await db.delete(user)
    
    # Log user deletion
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.DELETE,
        description=f"Deleted user account: {user.email} (Role: {user.role})",
        priority=ActivityPriority.CRITICAL,
        target_model="User",
        target_id=str(user_id)
    )
    
    await db.flush()


# ═══════════════════════════════════════════════════════════════════════════════
#  STUDENTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/students", response_model=StudentOut)
async def create_student(
    payload: StudentCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Check if email exists
    exist_email = (await db.execute(select(Student).where(Student.email == payload.email))).scalar_one_or_none()
    if exist_email:
        raise HTTPException(status_code=409, detail=f"A student with email '{payload.email}' already exists.")

    # Check if RFID exists
    exist_rfid = (await db.execute(select(Student).where(Student.rfid_uid == payload.rfid_uid))).scalar_one_or_none()
    if exist_rfid:
        raise HTTPException(status_code=409, detail=f"RFID UID '{payload.rfid_uid}' is already assigned to another student.")

    # Check if University ID exists
    if payload.university_id:
        exist_univ = (await db.execute(select(Student).where(Student.university_id == payload.university_id))).scalar_one_or_none()
        if exist_univ:
            raise HTTPException(status_code=409, detail=f"University ID '{payload.university_id}' is already registered.")

    student = Student(**payload.model_dump())
    
    # --- SUPER ADMIN BYPASS ---
    is_super = current_user.get("role") == "super_admin"
    if is_super:
        student.approval_status = ApprovalStatus.APPROVED
    
    db.add(student)
    await db.flush()
    await db.refresh(student)

    # 4. Auto-enroll in department courses
    # For regular admins, they go to PENDING and get enrolled when approved.
    # For super admins, we enroll them immediately.
    if is_super and payload.department_id:
        await enroll_student_in_department_courses(db, student.id, payload.department_id)

    # Also create a login account for this student with synced info
    existing_user_res = await db.execute(select(User).where(User.email == payload.email))
    user = existing_user_res.scalar_one_or_none()
    if not user:
        user = User(
            email=payload.email,
            name=payload.name,
            phone_number=payload.phone_number,
            password_hash=hash_password("Student@1234"),
            role=UserRole.student,
        )
        db.add(user)
    else:
        # If user already exists (e.g. from a different role), sync name and phone
        user.name = payload.name
        user.phone_number = payload.phone_number

    # Log student creation
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.CREATE,
        description=f"Created new student: {payload.name} ({payload.university_id})",
        priority=ActivityPriority.CAUTION,
        target_model="Student",
        target_id=str(student.university_id)
    )

    await db.commit()
    return student


@router.get("/students", response_model=list[StudentOut])
async def list_students(current_user: dict = Depends(require_engineer), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    query = select(Student).where(
        Student.approval_status == ApprovalStatus.APPROVED,
        Student.academic_status != AcademicStatus.GRADUATED
    )
    
    if role in ["engineer", "doctor"]:
        dept_ids = await get_scoped_department_ids(current_user, db)
        if dept_ids:
            query = query.where(Student.department_id.in_(dept_ids))
        else:
            query = query.where(False)  # Zero assignments = zero visibility
            
    query = query.order_by(Student.academic_year.asc(), Student.current_semester.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/students/pending")
async def list_pending_students(_=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student, Department.name.label("dept_name"), Faculty.name.label("fac_name"))
        .outerjoin(Department, Department.id == Student.department_id)
        .outerjoin(Faculty, Faculty.id == Department.faculty_id)
        .where(Student.approval_status == ApprovalStatus.PENDING)
        .order_by(Student.academic_year.asc(), Student.current_semester.asc())
    )
    
    pending = []
    for row in result.all():
        stu, dept_name, fac_name = row
        stu_out = StudentOut.model_validate(stu)
        stu_out.department_name = dept_name
        stu_out.faculty_name = fac_name
        pending.append(stu_out.model_dump())
        
    return pending

@router.post("/students/{student_id}/approve")
async def approve_student(
    student_id: int,
    payload: ApprovalUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if payload.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Use the restrict or reject features.")
        
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.approval_status = ApprovalStatus.APPROVED
    student.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    student.approved_by_id = current_user.get("user_id")
    await db.flush()
    
    # Auto-enroll newly approved students
    if student.department_id:
        await enroll_student_in_department_courses(db, student.id, student.department_id)

    await db.refresh(student)

    # Log approval
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.UPDATE,
        description=f"Approved student registration: {student.email}",
        priority=ActivityPriority.NORMAL,
        target_model="Student",
        target_id=str(student.id)
    )

    await db.commit()
    return student

@router.post("/students/{student_id}/reject")
async def reject_student(
    student_id: int,
    payload: RejectionRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.approval_status = ApprovalStatus.REJECTED
    student.rejection_reason = payload.reason
    student.rejected_at = datetime.now(timezone.utc).replace(tzinfo=None)
    student.rejected_by_id = current_user.get("user_id")
    await db.flush()

    # Log rejection
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.UPDATE,
        description=f"Rejected student registration: {student.email} (Reason: {payload.reason})",
        priority=ActivityPriority.WARNING,
        target_model="Student",
        target_id=str(student.id)
    )

    await db.commit()
    return {"detail": "Student registration rejected"}


@router.get("/students/history")
async def list_registration_history(
    status: str = "REJECTED",
    _=Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    from app.models.user import User
    
    target_status = ApprovalStatus.REJECTED if status == "REJECTED" else ApprovalStatus.APPROVED
    
    # Select student and join with processing admin
    # We join with User twice potentially? No, just once based on status.
    admin_alias = aliased(User)
    
    query = (
        select(
            Student, 
            Department.name.label("dept_name"), 
            Faculty.name.label("fac_name"),
            admin_alias.id.label("admin_id"),
            admin_alias.name.label("admin_name")
        )
        .outerjoin(Department, Department.id == Student.department_id)
        .outerjoin(Faculty, Faculty.id == Department.faculty_id)
    )

    if target_status == ApprovalStatus.REJECTED:
        query = query.outerjoin(admin_alias, admin_alias.id == Student.rejected_by_id).where(Student.approval_status == ApprovalStatus.REJECTED).order_by(Student.rejected_at.desc())
    else:
        query = query.outerjoin(admin_alias, admin_alias.id == Student.approved_by_id).where(Student.approval_status == ApprovalStatus.APPROVED).order_by(Student.approved_at.desc())

    result = await db.execute(query)
    
    history = []
    for row in result.all():
        stu, dept_name, fac_name, admin_id, admin_name = row
        stu_out = StudentOut.model_validate(stu)
        stu_out.department_name = dept_name
        stu_out.faculty_name = fac_name
        
        if target_status == ApprovalStatus.REJECTED:
            stu_out.rejected_by_id = admin_id
            stu_out.rejected_by_name = admin_name
        else:
            stu_out.approved_by_id = admin_id
            stu_out.approved_by_name = admin_name
            
        history.append(stu_out.model_dump())
        
    return history

@router.get("/students/history/export")
async def export_registration_history(
    status: str = "REJECTED",
    _=Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Exports registration history as CSV."""
    # Reuse the same logic as list_registration_history
    history = await list_registration_history(status=status, db=db)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = ["Name", "Email", "University ID", "Department ID", "Status"]
    if status == "REJECTED":
        headers += ["Rejected At", "Rejected By", "Reason"]
    else:
        headers += ["Approved At", "Approved By"]
        
    writer.writerow(headers)
    
    for h in history:
        row = [
            h.get("name"),
            h.get("email"),
            h.get("university_id"),
            h.get("department_id"),
            h.get("approval_status")
        ]
        if status == "REJECTED":
            row += [h.get("rejected_at"), h.get("rejected_by_name"), h.get("rejection_reason")]
        else:
            row += [h.get("approved_at"), h.get("approved_by_name")]
        writer.writerow(row)
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=registration_history_{status.lower()}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.delete("/students/history/clear")
async def clear_registration_history(
    status: str = "REJECTED",
    password: str = None, # Optional security check?
    _=Depends(require_capability_or_super_admin("SYSTEM_DATA_PURGE")),
    db: AsyncSession = Depends(get_db)
):
    """Deletes all registration records of a specific status. WARNING: Only for REJECTED by default."""
    if status != "REJECTED":
        raise HTTPException(status_code=400, detail="Only REJECTED history can be cleared bulkily for safety.")
        
    query = delete(Student).where(Student.approval_status == ApprovalStatus.REJECTED)
    await db.execute(query)
    await db.commit()
    return {"message": f"Successfully cleared all {status.lower()} registration records."}

@router.get("/students/{student_id}", response_model=StudentOut)
async def get_student(
    student_id: int,
    current_user: dict = Depends(require_any),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role")
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Security: If student, they can only see themselves
    if role == "student" and student.email != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="Access denied: You can only view your own profile.")
    
    # Staff catch-all (engineer or better)
    if role == "student" or role in ["super_admin", "admin", "doctor", "engineer"]:
        return student
        
    raise HTTPException(status_code=403, detail="Unauthorized role.")


@router.put("/students/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: int,
    payload: StudentUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Audit Snapshot: Before
    old_snapshot = get_model_snapshot(student)
    
    prev_dept_id = student.department_id
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(student, key, value)

    await db.flush()
    # Sync with User table
    await sync_profile_to_user(db, student.email, student)
    
    if payload.department_id is not None and payload.department_id != prev_dept_id:
        await enroll_student_in_department_courses(db, student.id, payload.department_id)

    await db.refresh(student)
    
    # Audit Snapshot: After
    new_snapshot = get_model_snapshot(student)
    diff = { k: {"old": old_snapshot.get(k), "new": v} for k, v in new_snapshot.items() if old_snapshot.get(k) != v }
    
    if diff:
        await log_activity(
            db,
            user_id=current_user.get("user_id"),
            user_email=current_user.get("sub"),
            user_role=current_user.get("role"),
            user_name=current_user.get("name"),
            action=ActivityAction.UPDATE,
            description=f"Updated student profile: {student.name}",
            priority=ActivityPriority.WARNING,
            target_model="Student",
            target_id=str(student.id),
            details={"diff": diff, "success": True}
        )

    await db.commit()
    return student


@router.delete("/students/{student_id}", status_code=204)
async def delete_student(
    student_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Record name for the log before deletion
    student_name = student.name
    student_email = student.email

    # Also delete the user account
    await db.execute(delete(User).where(User.email == student.email))
    await db.delete(student)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.DELETE,
        description=f"Permanently deleted student: {student_name} ({student_email})",
        priority=ActivityPriority.CRITICAL,
        target_model="Student",
        target_id=str(student_id)
    )
    
    await db.commit()


# ─── Pre-Verified List ────────────────────────────────────────────────────────
@router.post("/pre-verified", response_model=PreVerifiedStudentOut)
async def create_pre_verified(
    payload: PreVerifiedStudentCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(PreVerifiedStudent).where(PreVerifiedStudent.university_id == payload.university_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This University ID is already on the allowlist.")

    data = payload.model_dump()
    data["created_by_id"] = current_user.get("user_id")
    record = PreVerifiedStudent(**data)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record

@router.get("/pre-verified/export")
async def export_pre_verified(_=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Exports the allowlist as a professional CSV file."""
    result = await db.execute(select(PreVerifiedStudent))
    records = result.scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["University ID", "Name", "Phone Number", "Faculty ID", "Department ID", "Academic Year"])
    
    for r in records:
        writer.writerow([r.university_id, r.name, r.phone_number, r.faculty_id, r.department_id, r.academic_year])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')), 
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=allowlist_export_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.post("/pre-verified/import")
async def import_pre_verified(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Imports or updates allowlist records from a CSV file."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    content = await file.read()
    decoded = content.decode('utf-8-sig').splitlines()
    reader = csv.DictReader(decoded)
    
    count = 0
    errors = []
    
    for i, row in enumerate(reader):
        try:
            uid = row.get("University ID") or row.get("university_id")
            if not uid: continue
            
            # Check if exists to update or create
            existing = await db.execute(select(PreVerifiedStudent).where(PreVerifiedStudent.university_id == uid))
            record = existing.scalar_one_or_none()
            
            data = {
                "university_id": uid,
                "name": row.get("Name") or row.get("name") or "Unknown",
                "phone_number": row.get("Phone Number") or row.get("phone_number"),
                "faculty_id": int(row.get("Faculty ID") or row.get("faculty_id")) if (row.get("Faculty ID") or row.get("faculty_id")) else None,
                "department_id": int(row.get("Department ID") or row.get("department_id")) if (row.get("Department ID") or row.get("department_id")) else None,
                "academic_year": int(row.get("Academic Year") or row.get("academic_year")) if (row.get("Academic Year") or row.get("academic_year")) else None,
                "created_by_id": current_user.get("user_id")
            }
            
            if record:
                for k, v in data.items(): setattr(record, k, v)
            else:
                record = PreVerifiedStudent(**data)
                db.add(record)
            
            count += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")
            
    await db.commit()
    return {"message": f"Successfully processed {count} records.", "errors": errors}

@router.get("/pre-verified", response_model=list[PreVerifiedStudentOut])
async def list_pre_verified(_=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            PreVerifiedStudent, 
            Faculty.name.label("faculty_name"), 
            Department.name.label("department_name")
        )
        .outerjoin(Faculty, Faculty.id == PreVerifiedStudent.faculty_id)
        .outerjoin(Department, Department.id == PreVerifiedStudent.department_id)
    )
    
    records = []
    for row in result.all():
        record, fac_name, dept_name = row
        out = PreVerifiedStudentOut.model_validate(record)
        out.faculty_name = fac_name
        out.department_name = dept_name
        records.append(out)
        
    return records

@router.delete("/pre-verified/{pre_verified_id}", status_code=204)
async def delete_pre_verified(
    pre_verified_id: int,
    _=Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PreVerifiedStudent).where(PreVerifiedStudent.id == pre_verified_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await db.delete(record)
    await db.commit()

@router.get("/pre-verified/history")
async def get_pre_verified_history(_=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    # Fetch auto-approved students and join with User to get approver name
    result = await db.execute(
        select(Student, User.name.label("admin_name"))
        .outerjoin(User, User.id == Student.approved_by_id)
        .where(Student.is_auto_approved == True)
        .where(Student.auto_approve_history_cleared == False)
        .order_by(Student.approved_at.desc())
    )
    rows = result.all()
    
    history = []
    unseen_count = 0
    for row in rows:
        s, admin_name = row
        if not s.admin_seen_auto_approve:
            unseen_count += 1
        history.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "university_id": s.university_id,
            "id_card_image_url": s.id_card_image_url,
            "approved_at": s.approved_at,
            "admin_seen_auto_approve": s.admin_seen_auto_approve,
            "admin_name": admin_name or "System",
        })
        
    return {"history": history, "unseen_count": unseen_count}

@router.post("/pre-verified/history/mark-seen")
async def mark_pre_verified_history_seen(_=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Student)
        .where(Student.is_auto_approved == True)
        .where(Student.admin_seen_auto_approve == False)
        .values(admin_seen_auto_approve=True)
    )
    await db.commit()
    return {"message": "Marked all as seen"}

@router.get("/pre-verified/history/export")
async def export_pre_verified_history(_=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student, User.name.label("admin_name"))
        .outerjoin(User, User.id == Student.approved_by_id)
        .where(Student.is_auto_approved == True)
        .where(Student.auto_approve_history_cleared == False)
        .order_by(Student.approved_at.desc())
    )
    rows = result.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "University ID", "Added By", "Approved At"])
    
    for row in rows:
        s, admin_name = row
        writer.writerow([
            s.id, s.name, s.email, s.university_id,
            admin_name or "System",
            s.approved_at.isoformat() if s.approved_at else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')), 
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=auto_approve_history_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.delete("/pre-verified/history/clear")
async def clear_pre_verified_history(
    _=Depends(require_capability_or_super_admin("SYSTEM_DATA_PURGE")),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        update(Student)
        .where(Student.is_auto_approved == True)
        .where(Student.auto_approve_history_cleared == False)
        .values(auto_approve_history_cleared=True)
    )
    await db.commit()
    return {"message": "Auto-approve history cleared."}

@router.get("/students/{student_id}/profile", response_model=StudentProfileOut)
async def get_student_profile(
    student_id: int,
    current_user: dict = Depends(require_any),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role")
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Security: If student, they can only see themselves
    token_student_id = current_user.get("student_id")
    user_identity = current_user.get("sub") or current_user.get("email")
    if role == "student":
        is_authorized = False
        if token_student_id is not None and student.id == token_student_id:
            is_authorized = True
        elif student.email and user_identity and student.email.lower() == user_identity.lower():
            is_authorized = True
            
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Access denied: You can only view your own profile.")

    # 1. Get official enrollments
    enroll_result = await db.execute(
        select(Enrollment, Course)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Enrollment.student_id == student_id)
    )
    enrolled = enroll_result.all()
    
    # 2. Get courses where student has grades (even if not officially enrolled)
    grade_courses_result = await db.execute(
        select(Course)
        .join(Assessment, Assessment.course_code == Course.id)
        .join(GradeResult, GradeResult.assessment_id == Assessment.id)
        .where(GradeResult.student_id == student_id)
        .distinct()
    )
    grade_courses = grade_courses_result.scalars().all()

    # Combine them
    final_courses_map = {}
    for enr, course in enrolled:
        final_courses_map[course.id] = (enr, course)
    
    for gc in grade_courses:
        if gc.id not in final_courses_map:
            # Create a "virtual" enrollment if missing
            final_courses_map[gc.id] = (None, gc)

    enrolled_courses = []
    for enr, course in final_courses_map.values():
        try:
            # For virtual enrollments, pass None for enrollment - calculate_attendance_percentage handles it
            course_att_pct = await calculate_attendance_percentage(db, student_id, course.id, enrollment=enr)
            live_avg, total_prog, failed_final_rule, global_weight = await calculate_course_final(db, student_id, course.id)

            # Get instructor and doctor
            instructor_name = None
            if course.instructor_id:
                inst = (await db.execute(select(Instructor).where(Instructor.id == course.instructor_id))).scalar_one_or_none()
                if inst: instructor_name = inst.name
                
            doctor_name = None
            if course.doctor_id:
                doc = (await db.execute(select(Doctor).where(Doctor.id == course.doctor_id))).scalar_one_or_none()
                if doc: doctor_name = doc.name

            # Get roadmap (assessments)
            assessments_result = await db.execute(
                select(Assessment).where(Assessment.course_code == course.id).order_by(Assessment.date_assigned)
            )
            assessments = [{"id": a.id, "title": a.title, "assessment_type": a.assessment_type, "status": a.status, "weight_pct": a.weight_pct, "max_score": a.max_score} for a in assessments_result.scalars().all()]

            enrolled_courses.append({
                "id": course.id,
                "name": course.name,
                "enrolled_at": enr.enrolled_at.isoformat() if enr and enr.enrolled_at else None,
                "academic_year": course.academic_year,
                "semester": course.semester,
                "credits": course.credits,
                "passing_score": course.passing_score,
                "max_score": course.max_score,
                "attendance_percentage": round(course_att_pct, 1),
                "current_avg": round(live_avg, 1),
                "global_weight": round(global_weight, 1),
                "failed_final_rule": failed_final_rule,
                "is_current": enr.is_current if enr else True,
                "doctor_name": doctor_name,
                "instructor_name": instructor_name,
                "assessments": assessments
            })
        except Exception as e:
            print(f"[PROFILE_DEBUG] Error calculating for {course.name}: {e}")
            enrolled_courses.append({
                "id": course.id,
                "name": course.name,
                "enrolled_at": enr.enrolled_at.isoformat() if enr and enr.enrolled_at else None,
                "academic_year": course.academic_year,
                "semester": course.semester,
                "attendance_percentage": 0.0,
                "current_avg": 0.0,
                "global_weight": 0.0,
                "error": "Calculation error"
            })

    # Get legacy grades (old Grade table)
    grades_result = await db.execute(
        select(Grade).where(Grade.student_id == student_id).order_by(Grade.created_at.desc())
    )
    legacy_grades = [GradeOut.model_validate(g) for g in grades_result.scalars().all()]

    # Get committed gradebook results (GradeResult table, joined with Assessment)
    gr_result = await db.execute(
        select(GradeResult, Assessment, Course, Instructor.name.label("instructor_name"))
        .join(Assessment, Assessment.id == GradeResult.assessment_id)
        .join(Course, Course.id == Assessment.course_code)
        .outerjoin(Instructor, Instructor.id == Assessment.instructor_id)
        .where(GradeResult.student_id == student_id)
        .where(Assessment.status == "Finished")
        .order_by(GradeResult.id.desc())
    )
    committed_grades = []
    for row in gr_result.all():
        gr, ass, course, instructor_name = row
        committed_grades.append({
            "id": gr.id,
            "assessment_id": ass.id,
            "assessment_title": ass.title,
            "assessment_type": ass.assessment_type,
            "course_name": course.name,
            "raw_score": gr.raw_score,
            "max_score": ass.max_score,
            "weight_pct": ass.weight_pct,
            "weighted_score": round((gr.raw_score / ass.max_score) * ass.weight_pct, 2) if ass.max_score > 0 else 0,
            "instructor_remarks": gr.instructor_remarks,
            "instructor_name": instructor_name,
            "is_flagged": gr.is_flagged,
            "status": ass.status,
            "academic_year": course.academic_year,
            "semester": course.semester,
        })

    grades = legacy_grades

    # Get all course_ids this student is enrolled in
    course_ids = [c["id"] for c in enrolled_courses]

    # Count total sessions for enrolled courses
    if course_ids:
        total_sessions_result = await db.execute(
            select(func.count(Session.id)).where(Session.course_id.in_(course_ids))
        )
        total_sessions = total_sessions_result.scalar() or 0
    else:
        total_sessions = 0

    # Count attended sessions
    attended_result = await db.execute(
        select(func.count(Attendance.id)).where(Attendance.student_id == student_id)
    )
    attended_sessions = attended_result.scalar() or 0

    # Attendance percentage
    att_pct = round((attended_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0.0

    # Get attendance history with course names
    att_history_result = await db.execute(
        select(Attendance, Course.name.label("course_name"), Course.id.label("course_id"))
        .join(Session, Session.id == Attendance.session_id)
        .join(Course, Course.id == Session.course_id)
        .where(Attendance.student_id == student_id)
        .order_by(Attendance.timestamp.desc())
        .limit(50)
    )
    attendance_history = []
    for row in att_history_result.all():
        att, c_name, c_id = row
        out = AttendanceOut.model_validate(att).model_dump()
        out["course_name"] = c_name
        out["course_id"] = c_id
        attendance_history.append(out)

    # Get department and faculty names
    dept_name = None
    fac_name = None
    if student.department_id:
        dept_r = await db.execute(
            select(Department, Faculty)
            .join(Faculty, Faculty.id == Department.faculty_id)
            .where(Department.id == student.department_id)
        )
        row = dept_r.first()
        if row:
            dept_name = row[0].name
            fac_name = row[1].name

    student_out = StudentOut.model_validate(student)
    
    # Fetch user for profile image
    user_result = await db.execute(select(User).where(User.email == student.email))
    user_obj = user_result.scalar_one_or_none()
    if user_obj and user_obj.profile_image_url:
        student_out.profile_image_url = user_obj.profile_image_url

    # Academic performance (Weighted Average)
    total_perf_score = 0.0
    total_credits = 0.0
    for c in enrolled_courses:
        credits = c.get("credits", 3.0)
        total_perf_score += (c.get("current_avg", 0.0) * credits)
        total_credits += credits
    
    academic_perf = (total_perf_score / total_credits) if total_credits > 0 else 0.0
    
    # Get active sessions for enrolled courses
    active_sessions_result = await db.execute(
        select(Session, Course.name.label("course_name"))
        .join(Course, Course.id == Session.course_id)
        .where(Session.course_id.in_(course_ids))
        .where(Session.is_active == True)
    )
    active_sessions = []
    for s, c_name in active_sessions_result.all():
        active_sessions.append({
            "id": s.id,
            "course_id": s.course_id,
            "course_name": c_name,
            "start_time": s.start_time.isoformat()
        })

    return StudentProfileOut(
        student=student_out,
        attendance_percentage=att_pct,
        academic_performance=academic_perf,
        total_sessions=total_sessions,
        attended_sessions=attended_sessions,
        total_credits=total_credits,
        faculty_name=fac_name,
        department_name=dept_name,
        enrolled_courses=enrolled_courses,
        active_sessions=active_sessions,
        grades=grades,
        committed_grades=committed_grades,
        attendance_history=attendance_history,
    )


# ─── Blacklist ────────────────────────────────────────────────────────────────

@router.post("/students/{student_id}/blacklist", response_model=StudentOut)
async def blacklist_student(
    student_id: int,
    payload: BlacklistRequest,
    current_user: dict = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.is_blacklisted = True
    student.blacklist_reason = payload.reason
    await db.flush()
    await db.refresh(student)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        action=ActivityAction.UPDATE,
        description=f"Blacklisted student: {student.university_id}",
        priority=ActivityPriority.WARNING,
        target_model="Student",
        target_id=str(student.id)
    )
    
    await db.commit()
    return student


@router.delete("/students/{student_id}/blacklist", response_model=StudentOut)
async def unblacklist_student(
    student_id: int,
    current_user: dict = Depends(require_admin_or_doctor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.is_blacklisted = False
    student.blacklist_reason = None
    await db.flush()
    await db.refresh(student)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        action=ActivityAction.UPDATE,
        description=f"Removed student from blacklist: {student.university_id}",
        priority=ActivityPriority.NORMAL,
        target_model="Student",
        target_id=str(student.id)
    )
    
    await db.commit()
    return student


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTRUCTORS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/instructors", response_model=InstructorOut)
async def create_instructor(
    payload: InstructorCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Check if email exists
    exist_email = (await db.execute(select(Instructor).where(Instructor.email == payload.email))).scalar_one_or_none()
    if exist_email:
        raise HTTPException(status_code=409, detail=f"An instructor with email '{payload.email}' already exists.")

    # Create instructor first
    data = payload.model_dump(exclude={"faculty_ids", "department_ids"})
    instructor = Instructor(**data)
    
    instructor.faculties = []
    instructor.departments = []
    
    if payload.faculty_ids:
        res = await db.execute(select(Faculty).where(Faculty.id.in_(payload.faculty_ids)))
        instructor.faculties = list(res.scalars().all())
    
    if payload.department_ids:
        res = await db.execute(select(Department).where(Department.id.in_(payload.department_ids)))
        instructor.departments = list(res.scalars().all())

    db.add(instructor)

    # Also create a user account for the instructor with synced info
    existing_user_res = await db.execute(select(User).where(User.email == payload.email))
    user = existing_user_res.scalar_one_or_none()
    if not user:
        user = User(
            email=payload.email,
            name=payload.name,
            phone_number=payload.phone_number,
            password_hash=hash_password("Instructor@1234"),
            role=UserRole.engineer,
        )
        db.add(user)
    else:
        user.name = payload.name
        user.phone_number = payload.phone_number

    await db.refresh(instructor)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        action=ActivityAction.CREATE,
        description=f"Created instructor account: {instructor.name} ({instructor.email})",
        priority=ActivityPriority.NORMAL,
        target_model="Instructor",
        target_id=str(instructor.id)
    )
    
    await db.commit()
    return instructor


@router.get("/instructors", response_model=list[InstructorOut])
async def list_instructors(_=Depends(require_engineer), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Instructor).options(selectinload(Instructor.faculties), selectinload(Instructor.departments))
    )
    return result.scalars().all()


@router.get("/instructors/{instructor_id}/profile", response_model=InstructorProfileOut)
async def get_instructor_profile(
    instructor_id: int,
    _=Depends(require_engineer),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Instructor)
        .options(selectinload(Instructor.faculties), selectinload(Instructor.departments))
        .where(Instructor.id == instructor_id)
    )
    instructor = res.scalar_one_or_none()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    
    # Get courses assigned
    course_res = await db.execute(select(Course).where(Course.instructor_id == instructor_id))
    courses = course_res.scalars().all()
    assigned = [
        {"id": c.id, "name": c.name, "course_code": c.course_code, "academic_year": c.academic_year, "semester": c.semester}
        for c in courses
    ]
    
    # Get profile image from user table
    user_res = await db.execute(select(User).where(User.email == instructor.email))
    user = user_res.scalar_one_or_none()
    
    instructor_out = InstructorOut.model_validate(instructor)
    if user:
        instructor_out.profile_image_url = user.profile_image_url
        
        # Get active capabilities
        caps_res = await db.execute(
            select(UserCapability)
            .where(UserCapability.user_id == user.id)
            .where((UserCapability.expires_at == None) | (UserCapability.expires_at > datetime.now(timezone.utc)))
        )
        capabilities = caps_res.scalars().all()
        instructor_out.capabilities = capabilities
    
    return InstructorProfileOut(
        instructor=instructor_out,
        assigned_courses=assigned
    )


@router.put("/instructors/{instructor_id}", response_model=InstructorOut)
async def update_instructor(
    instructor_id: int,
    payload: InstructorUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Instructor).options(selectinload(Instructor.faculties), selectinload(Instructor.departments)).where(Instructor.id == instructor_id)
    )
    instructor = result.scalar_one_or_none()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")

    # Audit Snapshot: Before
    old_snapshot = get_model_snapshot(instructor)

    update_data = payload.model_dump(exclude_unset=True, exclude={"faculty_ids", "department_ids"})
    for key, value in update_data.items():
        setattr(instructor, key, value)

    if payload.faculty_ids is not None:
        res = await db.execute(select(Faculty).where(Faculty.id.in_(payload.faculty_ids)))
        instructor.faculties = list(res.scalars().all())
        
    if payload.department_ids is not None:
        res = await db.execute(select(Department).where(Department.id.in_(payload.department_ids)))
        instructor.departments = list(res.scalars().all())

    await db.flush()
    # Sync with User table
    await sync_profile_to_user(db, instructor.email, instructor)
    await db.refresh(instructor)
    
    # Audit Snapshot: After
    new_snapshot = get_model_snapshot(instructor)
    diff = { k: {"old": old_snapshot.get(k), "new": v} for k, v in new_snapshot.items() if old_snapshot.get(k) != v }
    
    if diff:
        await log_activity(
            db,
            user_id=current_user.get("user_id"),
            user_email=current_user.get("sub"),
            user_role=current_user.get("role"),
            user_name=current_user.get("name"),
            action=ActivityAction.UPDATE,
            description=f"Updated instructor profile: {instructor.name}",
            priority=ActivityPriority.WARNING,
            target_model="Instructor",
            target_id=str(instructor.id),
            details={"diff": diff, "success": True}
        )
        
    await db.commit()
    return instructor


@router.delete("/instructors/{instructor_id}", status_code=204)
async def delete_instructor(
    instructor_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Instructor).where(Instructor.id == instructor_id))
    instructor = result.scalar_one_or_none()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")

    name = instructor.name
    email = instructor.email

    await db.execute(delete(User).where(User.email == instructor.email))
    await db.delete(instructor)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.DELETE,
        description=f"Permanently deleted instructor: {name} ({email})",
        priority=ActivityPriority.CRITICAL,
        target_model="Instructor",
        target_id=str(instructor_id)
    )
    
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  DOCTORS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/doctors", response_model=DoctorOut)
async def create_doctor(
    payload: DoctorCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Check if email exists
    exist_email = (await db.execute(select(Doctor).where(Doctor.email == payload.email))).scalar_one_or_none()
    if exist_email:
        raise HTTPException(status_code=409, detail=f"A doctor with email '{payload.email}' already exists.")

    # Also create a user account for the doctor with synced info
    existing_user_res = await db.execute(select(User).where(User.email == payload.email))
    user = existing_user_res.scalar_one_or_none()
    if not user:
        user = User(
            email=payload.email,
            name=payload.name,
            phone_number=payload.phone_number,
            password_hash=hash_password("Doctor@1234"),
            role=UserRole.doctor,
        )
        db.add(user)
    else:
        user.name = payload.name
        user.phone_number = payload.phone_number

    # Create doctor logic
    doc_data = payload.model_dump(exclude={"faculty_ids", "department_ids"})
    doctor = Doctor(**doc_data)
    
    doctor.faculties = []
    doctor.departments = []
    
    if payload.faculty_ids:
        res = await db.execute(select(Faculty).where(Faculty.id.in_(payload.faculty_ids)))
        doctor.faculties = list(res.scalars().all())
        
    if payload.department_ids:
        res = await db.execute(select(Department).where(Department.id.in_(payload.department_ids)))
        doctor.departments = list(res.scalars().all())

    db.add(doctor)
    await db.refresh(doctor)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        action=ActivityAction.CREATE,
        description=f"Created doctor account: {doctor.name} ({doctor.email})",
        priority=ActivityPriority.NORMAL,
        target_model="Doctor",
        target_id=str(doctor.id)
    )
    
    await db.commit()
    return doctor


@router.get("/doctors", response_model=list[DoctorOut])
async def list_doctors(_=Depends(require_engineer), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Doctor).options(selectinload(Doctor.faculties), selectinload(Doctor.departments))
    )
    return result.scalars().all()


@router.get("/doctors/{doctor_id}/profile", response_model=DoctorProfileOut)
async def get_doctor_profile(
    doctor_id: int,
    _=Depends(require_engineer),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Doctor)
        .options(selectinload(Doctor.faculties), selectinload(Doctor.departments))
        .where(Doctor.id == doctor_id)
    )
    doctor = res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Get courses assigned
    course_res = await db.execute(select(Course).where(Course.doctor_id == doctor_id))
    courses = course_res.scalars().all()
    assigned = [
        {"id": c.id, "name": c.name, "course_code": c.course_code, "academic_year": c.academic_year, "semester": c.semester}
        for c in courses
    ]
    
    # Get profile image from user table
    user_res = await db.execute(select(User).where(User.email == doctor.email))
    user = user_res.scalar_one_or_none()
    
    doctor_out = DoctorOut.model_validate(doctor)
    if user:
        doctor_out.profile_image_url = user.profile_image_url
        
        # Get active capabilities
        caps_res = await db.execute(
            select(UserCapability)
            .where(UserCapability.user_id == user.id)
            .where((UserCapability.expires_at == None) | (UserCapability.expires_at > datetime.now(timezone.utc)))
        )
        capabilities = caps_res.scalars().all()
        doctor_out.capabilities = capabilities
    
    return DoctorProfileOut(
        doctor=doctor_out,
        assigned_courses=assigned
    )


@router.put("/doctors/{doctor_id}", response_model=DoctorOut)
async def update_doctor(
    doctor_id: int,
    payload: DoctorUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Doctor).options(selectinload(Doctor.faculties), selectinload(Doctor.departments)).where(Doctor.id == doctor_id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Audit Snapshot: Before
    old_snapshot = get_model_snapshot(doctor)

    update_data = payload.model_dump(exclude_unset=True, exclude={"faculty_ids", "department_ids"})
    for key, value in update_data.items():
        setattr(doctor, key, value)

    if payload.faculty_ids is not None:
        res = await db.execute(select(Faculty).where(Faculty.id.in_(payload.faculty_ids)))
        doctor.faculties = list(res.scalars().all())
        
    if payload.department_ids is not None:
        res = await db.execute(select(Department).where(Department.id.in_(payload.department_ids)))
        doctor.departments = list(res.scalars().all())

    await db.flush()
    # Sync with User table
    await sync_profile_to_user(db, doctor.email, doctor)
    await db.refresh(doctor)
    
    # Audit Snapshot: After
    new_snapshot = get_model_snapshot(doctor)
    diff = { k: {"old": old_snapshot.get(k), "new": v} for k, v in new_snapshot.items() if old_snapshot.get(k) != v }
    
    if diff:
        await log_activity(
            db,
            user_id=current_user.get("user_id"),
            user_email=current_user.get("sub"),
            user_role=current_user.get("role"),
            user_name=current_user.get("name"),
            action=ActivityAction.UPDATE,
            description=f"Updated doctor profile: {doctor.name}",
            priority=ActivityPriority.WARNING,
            target_model="Doctor",
            target_id=str(doctor_id),
            details={"diff": diff, "success": True}
        )
        
    return doctor


@router.delete("/doctors/{doctor_id}", status_code=204)
async def delete_doctor(
    doctor_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    name = doctor.name
    email = doctor.email

    await db.execute(delete(User).where(User.email == doctor.email))
    await db.delete(doctor)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.DELETE,
        description=f"Permanently deleted doctor: {name} ({email})",
        priority=ActivityPriority.CRITICAL,
        target_model="Doctor",
        target_id=str(doctor_id)
    )
    
    await db.flush()


# ═══════════════════════════════════════════════════════════════════════════════
#  COURSES
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/courses", response_model=CourseOut)
async def create_course(
    payload: CourseCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    is_medicine = False
    if payload.department_id:
        dept = (await db.execute(select(Department).where(Department.id == payload.department_id))).scalar_one_or_none()
        if not dept: raise HTTPException(status_code=404, detail="Department not found")
        faculty = (await db.execute(select(Faculty).where(Faculty.id == dept.faculty_id))).scalar_one_or_none()
        if faculty and "medicine" in faculty.name.lower():
            is_medicine = True

    # Prepare course data
    course_data = payload.model_dump(exclude={"assessment_blueprint"})
    course = Course(**course_data)
    
    if payload.assessment_blueprint:
        import json
        course.assessment_blueprint = json.dumps([item.model_dump() for item in payload.assessment_blueprint])

    db.add(course)
    await db.flush()
    await db.refresh(course)

    if is_medicine:
        final_blueprint = []
        if payload.assessment_blueprint:
            final_blueprint = [b.model_dump() for b in payload.assessment_blueprint]
        else:
            prac_weight = 20.0 if payload.has_practical else 0.0
            final_weight = 40.0 + (0.0 if payload.has_practical else 20.0)
            final_blueprint = [
                {"title": "Quiz 1", "assessment_type": "Quiz", "weight_pct": 10.0, "template_key": "quiz_1", "enabled": True},
                {"title": "Midterm", "assessment_type": "Midterm", "weight_pct": 20.0, "template_key": "midterm", "enabled": True},
                {"title": "Quiz 2", "assessment_type": "Quiz", "weight_pct": 10.0, "template_key": "quiz_2", "enabled": True},
                {"title": "Practical Exam", "assessment_type": "Practical", "weight_pct": prac_weight, "template_key": "practical", "enabled": payload.has_practical},
                {"title": "Final Exam", "assessment_type": "Final", "weight_pct": final_weight, "template_key": "final", "enabled": True},
            ]
            import json
            course.assessment_blueprint = json.dumps(final_blueprint)

        assessments_to_create = []
        for item in final_blueprint:
            if not item.get("enabled", True): continue
            if item.get("weight_pct", 0) <= 0: continue
            assessments_to_create.append(Assessment(
                course_code=course.id,
                title=item["title"],
                assessment_type=item["assessment_type"],
                weight_pct=item["weight_pct"],
                template_key=item["template_key"],
                max_score=round((course.max_score * item["weight_pct"]) / 100.0, 1)
            ))
        if assessments_to_create: db.add_all(assessments_to_create)
        
    await db.commit()
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"), 
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.CREATE,
        description=f"Created course: {course.name} ({course.course_code})",
        priority=ActivityPriority.NORMAL,
        target_model="Course",
        target_id=str(course.id)
    )
    return course


@router.get("/courses", response_model=list[CourseOut])
async def list_courses(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    query = select(Course)
    
    if role in ["engineer", "doctor"]:
        dept_ids = await get_scoped_department_ids(current_user, db)
        if dept_ids:
            query = query.where(Course.department_id.in_(dept_ids))
        else:
            query = query.where(False) # Zero assignments = zero visibility
    elif role == "student":
        user_email = current_user.get("sub")
        query = query.join(Enrollment, Enrollment.course_id == Course.id)\
                     .join(Student, Student.id == Enrollment.student_id)\
                     .where(Student.email == user_email, Enrollment.is_current == True)
            
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/courses/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Audit Snapshot: Before
    old_snapshot = get_model_snapshot(course)

    if payload.department_id is not None:
        dept = (await db.execute(select(Department).where(Department.id == payload.department_id))).scalar_one_or_none()
        if not dept: raise HTTPException(status_code=404, detail="Department not found")

    update_data = payload.model_dump(exclude_unset=True)
    
    # ──── Practical Assessment Sync ────
    if "has_practical" in update_data and update_data["has_practical"] != course.has_practical:
        import json
        if not update_data["has_practical"]:
            await db.execute(delete(Assessment).where(Assessment.course_code == course.id, Assessment.template_key == "practical"))
        
        if course.assessment_blueprint:
            try:
                blueprint = json.loads(course.assessment_blueprint)
                if update_data["has_practical"]:
                    has_p = False
                    for b in blueprint:
                        if b.get("template_key") == "practical":
                            b["enabled"] = True; b["weight_pct"] = 20.0; has_p = True
                        if b.get("template_key") == "final": b["weight_pct"] = 40.0
                    if not has_p:
                        blueprint.insert(-1, {"title": "Practical Exam", "assessment_type": "Practical", "weight_pct": 20.0, "template_key": "practical", "enabled": True})
                else:
                    blueprint = [b for b in blueprint if b.get("template_key") != "practical"]
                    for b in blueprint:
                        if b.get("template_key") == "final": b["weight_pct"] = 60.0
                course.assessment_blueprint = json.dumps(blueprint)
            except Exception: pass

    for key, value in update_data.items():
        if key == "assessment_blueprint": continue 
        setattr(course, key, value)

    await db.flush()
    await db.refresh(course)
    
    # Audit Snapshot: After
    new_snapshot = get_model_snapshot(course)
    diff = { k: {"old": old_snapshot.get(k), "new": v} for k, v in new_snapshot.items() if old_snapshot.get(k) != v }
    
    if diff:
        await log_activity(
            db,
            user_id=current_user.get("user_id"),
            user_email=current_user.get("sub"),
            user_role=current_user.get("role"),
            user_name=current_user.get("name"),
            action=ActivityAction.UPDATE,
            description=f"Updated course settings: {course.name}",
            priority=ActivityPriority.WARNING,
            target_model="Course",
            target_id=str(course_id),
            details={"diff": diff, "success": True}
        )
        
    await db.commit()
    return course


@router.delete("/courses/{course_id}", status_code=204)
async def delete_course(
    course_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course_name = course.name
    course_code = course.course_code

    await db.delete(course)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.DELETE,
        description=f"Permanently deleted course: {course_name} ({course_code})",
        priority=ActivityPriority.CRITICAL,
        target_model="Course",
        target_id=str(course_id)
    )
    
    await db.commit()


@router.get("/courses/{course_id}/detail", response_model=CourseDetailOut)
async def get_course_detail(
    course_id: int,
    _=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get instructor/doctor names
    instructor_name = None
    if course.instructor_id:
        inst_r = await db.execute(select(Instructor).where(Instructor.id == course.instructor_id))
        inst = inst_r.scalar_one_or_none()
        instructor_name = inst.name if inst else None

    doctor_name = None
    if course.doctor_id:
        doc_r = await db.execute(select(Doctor).where(Doctor.id == course.doctor_id))
        doc = doc_r.scalar_one_or_none()
        doctor_name = doc.name if doc else None

    # Get department and faculty names
    department_name = None
    faculty_name = None
    if course.department_id:
        dept_r = await db.execute(select(Department).where(Department.id == course.department_id))
        dept = dept_r.scalar_one_or_none()
        if dept:
            department_name = dept.name
            fac_r = await db.execute(select(Faculty).where(Faculty.id == dept.faculty_id))
            fac = fac_r.scalar_one_or_none()
            if fac:
                faculty_name = fac.name

    # Get enrolled students
    enroll_result = await db.execute(
        select(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .where(Enrollment.course_id == course_id)
    )
    students = enroll_result.scalars().all()
    enrolled_students = [StudentOut.model_validate(s) for s in students]

    # Blacklisted students in this course
    blacklisted = [s for s in enrolled_students if s.is_blacklisted]

    # Attendance stats
    session_count_result = await db.execute(
        select(func.count(Session.id)).where(Session.course_id == course_id)
    )
    total_sessions = session_count_result.scalar() or 0

    total_possible = total_sessions * len(enrolled_students) if enrolled_students else 0

    if total_possible > 0:
        att_count_result = await db.execute(
            select(func.count(Attendance.id))
            .join(Session, Session.id == Attendance.session_id)
            .where(Session.course_id == course_id)
        )
        total_attended = att_count_result.scalar() or 0
        attendance_rate = round((total_attended / total_possible * 100), 1)
    else:
        attendance_rate = 0.0

    # Get prerequisite (parent) course info
    prerequisite_course = None
    if course.parent_course_id:
        parent_r = await db.execute(select(Course).where(Course.id == course.parent_course_id))
        parent = parent_r.scalar_one_or_none()
        if parent:
            prerequisite_course = {"id": parent.id, "name": parent.name, "course_code": parent.course_code}

    # Get sub-courses (courses that have this as parent)
    sub_result = await db.execute(
        select(Course).where(Course.parent_course_id == course_id).order_by(Course.tier_level)
    )
    sub_courses_list = [
        {"id": sc.id, "name": sc.name, "course_code": sc.course_code, "tier_level": sc.tier_level, "academic_year": sc.academic_year, "semester": sc.semester}
        for sc in sub_result.scalars().all()
    ]

    # Get assessments for the Visual Roadmap
    assessments_result = await db.execute(
        select(Assessment).where(Assessment.course_code == course_id).order_by(Assessment.date_assigned)
    )
    assessments_list = [
        {
            "id": a.id,
            "title": a.title,
            "assessment_type": a.assessment_type,
            "status": a.status,
            "weight_pct": a.weight_pct
        }
        for a in assessments_result.scalars().all()
    ]

    return CourseDetailOut(
        course=CourseOut.model_validate(course),
        faculty_name=faculty_name,
        department_name=department_name,
        instructor_name=instructor_name,
        doctor_name=doctor_name,
        enrolled_students=enrolled_students,
        attendance_rate=attendance_rate,
        total_sessions=total_sessions,
        blacklisted_students=blacklisted,
        prerequisite_course=prerequisite_course,
        sub_courses=sub_courses_list,
        assessments=assessments_list,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  ENROLLMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/enrollments", response_model=EnrollmentOut)
async def create_enrollment(
    payload: EnrollmentCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Verify student and course exist
    student = (await db.execute(select(Student).where(Student.id == payload.student_id))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    course = (await db.execute(select(Course).where(Course.id == payload.course_id))).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Year-level validation: prevent enrolling in wrong year's courses
    if course.academic_year and student.academic_year:
        if course.academic_year != student.academic_year:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot enroll: student is in Year {student.academic_year} but course '{course.name}' belongs to Year {course.academic_year}."
            )

    # Prerequisite validation: if course has a parent, ensure student completed it
    if course.parent_course_id:
        prereq_check = await db.execute(
            select(Enrollment).where(
                Enrollment.student_id == payload.student_id,
                Enrollment.course_id == course.parent_course_id,
                Enrollment.status == "COMPLETED"
            )
        )
        if not prereq_check.scalar_one_or_none():
            # Get parent course name for better error message
            parent = (await db.execute(select(Course).where(Course.id == course.parent_course_id))).scalar_one_or_none()
            parent_name = parent.name if parent else f"Course #{course.parent_course_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Prerequisite not met: student must complete '{parent_name}' before enrolling in '{course.name}'."
            )

    # Check for duplicate ACTIVE enrollment
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == payload.student_id,
            Enrollment.course_id == payload.course_id,
            Enrollment.status == "ACTIVE"
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Student already enrolled in this course")

    enrollment = Enrollment(
        student_id=payload.student_id,
        course_id=payload.course_id,
        status="ACTIVE",
        academic_year_snapshot=student.academic_year
    )
    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        action=ActivityAction.CREATE,
        description=f"Enrolled student #{student.university_id} in course: {course.name}",
        priority=ActivityPriority.NORMAL,
        target_model="Enrollment",
        target_id=str(enrollment.id)
    )
    
    await db.commit()
    return enrollment


@router.get("/enrollments", response_model=list[EnrollmentOut])
async def list_enrollments(current_user: dict = Depends(require_engineer), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role")
    query = select(Enrollment)
    
    if role in ["engineer", "doctor"]:
        dept_ids = await get_scoped_department_ids(current_user, db)
        if dept_ids:
            query = query.join(Course, Course.id == Enrollment.course_id).where(Course.department_id.in_(dept_ids))
        else:
            query = query.where(False)
            
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/courses/{course_id}/students", response_model=list[StudentOut])
async def list_course_students(
    course_id: int,
    _=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .where(Enrollment.course_id == course_id)
    )
    return result.scalars().all()


@router.delete("/enrollments/{enrollment_id}", status_code=204)
async def delete_enrollment(
    enrollment_id: int,
    _=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    await db.delete(enrollment)
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  GRADES
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/grades", response_model=GradeOut)
async def create_grade(
    payload: GradeCreate,
    _=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    grade = Grade(**payload.model_dump())
    db.add(grade)
    await db.flush()
    await db.refresh(grade)
    await db.commit()
    return grade


@router.get("/students/{student_id}/grades", response_model=list[GradeOut])
async def get_student_grades(
    student_id: int,
    _=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Grade).where(Grade.student_id == student_id).order_by(Grade.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/grades/{grade_id}", status_code=204)
async def delete_grade(
    grade_id: int,
    _=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Grade).where(Grade.id == grade_id))
    grade = result.scalar_one_or_none()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    await db.delete(grade)
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  DEVICES
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/devices", response_model=DeviceOut)
async def register_device(
    payload: DeviceCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Use provided key or generate new one
    api_key = payload.api_key if payload.api_key else secrets.token_urlsafe(32)
    device = Device(
        device_name=payload.device_name,
        location=payload.location,
        api_key=api_key,
    )
    db.add(device)
    await db.flush()
    await db.refresh(device)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        action=ActivityAction.CREATE,
        description=f"Registered new IoT device: {device.device_name} (Location: {device.location})",
        priority=ActivityPriority.CAUTION,
        target_model="Device",
        target_id=str(device.id)
    )
    
    await db.commit()
    return device


@router.get("/devices", response_model=list[DeviceOut])
async def list_devices(_=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device))
    return result.scalars().all()


@router.put("/devices/{device_id}", response_model=DeviceOut)
async def update_device(
    device_id: int,
    payload: DeviceUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Audit Snapshot: Before
    old_snapshot = get_model_snapshot(device)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)

    await db.flush()
    await db.refresh(device)
    
    # Audit Snapshot: After
    new_snapshot = get_model_snapshot(device)
    diff = { k: {"old": old_snapshot.get(k), "new": v} for k, v in new_snapshot.items() if old_snapshot.get(k) != v }
    
    if diff:
        await log_activity(
            db,
            user_id=current_user.get("user_id"),
            user_email=current_user.get("sub"),
            user_role=current_user.get("role"),
            user_name=current_user.get("name"),
            action=ActivityAction.UPDATE,
            description=f"Updated IoT Device config: {device.device_name} ({device.location})",
            priority=ActivityPriority.WARNING,
            target_model="Device",
            target_id=str(device_id),
            details={"diff": diff, "success": True}
        )
        
    await db.commit()
    return device


@router.delete("/devices/{device_id}", status_code=204)
async def delete_device(
    device_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device #{device_id} not found in database.")
    
    name = device.device_name
    loc = device.location

    await db.delete(device)
    
    await log_activity(
        db,
        user_id=current_user.get("user_id"),
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=current_user.get("name"),
        action=ActivityAction.DELETE,
        description=f"Permanently decommissioned device: {name} (Location: {loc})",
        priority=ActivityPriority.CRITICAL,
        target_model="Device",
        target_id=str(device_id)
    )
    
    await db.flush()
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  REPORTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/reports/session/{session_id}", response_model=AttendanceReport)
async def session_report(
    session_id: int,
    _=Depends(require_engineer),
    db: AsyncSession = Depends(get_db),
):
    # 1. Get session + course info
    result = await db.execute(
        select(Session, Course)
        .join(Course, Course.id == Session.course_id)
        .where(Session.id == session_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    session, course = row

    # 2. Get all enrolled students for this course with their profile info
    enrollment_query = (
        select(Student, Department.name.label("dept_name"))
        .join(Enrollment, Enrollment.student_id == Student.id)
        .outerjoin(Department, Department.id == Student.department_id)
        .where(Enrollment.course_id == course.id)
    )
    enrollment_res = await db.execute(enrollment_query)
    enrolled_data = enrollment_res.all()
    total = len(enrolled_data)

    # 3. Get attendance records for this specific session
    att_result = await db.execute(
        select(Attendance).where(Attendance.session_id == session_id)
    )
    att_records = {a.student_id: a for a in att_result.scalars().all()}
    
    present_count = len(att_records)
    absent_count = max(0, total - present_count)
    rate = round((present_count / total * 100), 1) if total > 0 else 0.0

    # 4. Build enriched records list
    final_records = []
    for student, dept_name in enrolled_data:
        att = att_records.get(student.id)
        final_records.append({
            "student_id": student.id,
            "student_name": student.name,
            "university_id": student.university_id,
            "department_name": dept_name,
            "timestamp": att.timestamp if att else None,
            "status": att.status if att else "absent"
        })

    # Sort records: Present first, then by name
    final_records.sort(key=lambda x: (x["status"] == "absent", x["student_name"]))

    return AttendanceReport(
        session_id=session_id,
        course_name=course.name,
        total_students=total,
        present=present_count,
        absent=absent_count,
        attendance_rate=rate,
        records=final_records,
    )
