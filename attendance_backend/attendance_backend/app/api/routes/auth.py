from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.student import Student, ApprovalStatus
from app.models.pre_verified import PreVerifiedStudent
from app.models.verification import VerificationToken, TokenType
from app.models.instructor import Instructor
from app.models.doctor import Doctor
from app.models.term_config import TermConfig
from app.schemas.schemas import (
    LoginRequest, TokenResponse,
    RegistrationInit, TokenVerification,
    PasswordResetRequest, PasswordResetConfirm
)
from app.core.security import verify_password, hash_password, create_access_token, get_current_user
from app.services.automation import enroll_student_in_department_courses
from app.services.scoping import get_scoped_department_ids, get_scoped_faculty_ids
from datetime import datetime, timedelta, timezone
import secrets
import string
import os
import uuid
from app.services.activity_logger import log_activity
from app.services.sync_service import sync_profile_to_user, sync_user_to_profile, ensure_profile_exists
from app.models.permission import UserCapability
from app.models.activity import ActivityAction, ActivityPriority

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/config")
async def get_public_config(db: AsyncSession = Depends(get_db)):
    """Public endpoint to fetch system-wide branding (e.g. logo)."""
    result = await db.execute(select(TermConfig).where(TermConfig.id == 1))
    config = result.scalar_one_or_none()
    if not config:
        # Return defaults if not seeded
        return {"system_logo_url": None}
    return {"system_logo_url": config.system_logo_url}

def generate_token(length=8):
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    login_email = payload.email.lower()
    result = await db.execute(select(User).where(User.email == login_email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    session_id = str(uuid.uuid4())
    user.last_login = datetime.now(timezone.utc).isoformat() + "Z"
    user.current_session_id = session_id
    
    # Log successful login
    await log_activity(
        db, 
        user_id=user.id,
        user_email=user.email,
        user_role=user.role.value,
        user_name=user.name,
        action=ActivityAction.LOGIN,
        description=f"User {user.email} logged in successfully",
        priority=ActivityPriority.NORMAL,
        user_avatar=user.profile_image_url,
        session_id=session_id
    )
    await db.commit()

    student_id = None
    instructor_id = None
    doctor_id = None
    
    if user.role == UserRole.student:
        st_res = await db.execute(select(Student).where(Student.email == user.email.lower()))
        student = st_res.scalar_one_or_none()
        if student:
            if student.approval_status != ApprovalStatus.APPROVED:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account is pending admin approval."
                )
            student_id = student.id
    elif user.role == UserRole.engineer:
        inst_res = await db.execute(select(Instructor).where(Instructor.email == user.email))
        inst = inst_res.scalar_one_or_none()
        if inst:
            instructor_id = inst.id
    elif user.role == UserRole.doctor:
        doc_res = await db.execute(select(Doctor).where(Doctor.email == user.email))
        doc = doc_res.scalar_one_or_none()
        if doc:
            doctor_id = doc.id

    # Fetch active capabilities for token and response
    cap_result = await db.execute(
        select(UserCapability.capability_name)
        .where(UserCapability.user_id == user.id)
        .where((UserCapability.expires_at == None) | (UserCapability.expires_at > datetime.now(timezone.utc)))
    )
    capabilities = [row[0] for row in cap_result.all()]

    # Get assignments for token and response
    temp_payload = {
        "user_id": user.id, 
        "role": user.role.value, 
        "sub": user.email, 
        "student_id": student_id, 
        "instructor_id": instructor_id, 
        "doctor_id": doctor_id, 
        "session_id": session_id,
        "capabilities": capabilities
    }
    dept_ids = await get_scoped_department_ids(temp_payload, db)
    fac_ids = await get_scoped_faculty_ids(temp_payload, db)

    token = create_access_token({
        **temp_payload,
        "assigned_department_ids": dept_ids,
        "assigned_faculty_ids": fac_ids
    })

    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=user.id,
        name=user.name,
        student_id=student_id,
        instructor_id=instructor_id,
        doctor_id=doctor_id,
        profile_image_url=user.profile_image_url,
        assigned_department_ids=dept_ids,
        assigned_faculty_ids=fac_ids,
        capabilities=capabilities
    )

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = current_user.get("user_id")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    user_name = user.name if user else "Unknown"

    # Log successful logout
    await log_activity(
        db, 
        user_id=user_id,
        user_email=current_user.get("sub"),
        user_role=current_user.get("role"),
        user_name=user_name,
        action=ActivityAction.LOGOUT,
        description=f"User {current_user.get('sub')} logged out",
        priority=ActivityPriority.NORMAL,
        session_id=current_user.get("session_id")
    )
    await db.commit()
    return {"message": "Logged out successfully"}

@router.post("/register/init")
async def register_init(payload: RegistrationInit, db: AsyncSession = Depends(get_db)):
    user_exists = await db.execute(select(User).where(User.email == payload.email))
    if user_exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    token_str = generate_token()
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    token_obj = VerificationToken(
        token=token_str,
        target=payload.email,
        token_type=TokenType.email_verification,
        expires_at=expires_at
    )
    db.add(token_obj)
    await db.commit()
    
    print(f"\n--- SIMULATED EMAIL ---")
    print(f"To: {payload.email}")
    print(f"Subject: Your Registration Token")
    print(f"Token: {token_str}")
    print(f"-----------------------\n")
    
    # Return token in response for the offline popup system
    return {
        "message": "Verification token generated",
        "debug_token": token_str
    }

@router.post("/register/verify")
async def register_verify(payload: TokenVerification, db: AsyncSession = Depends(get_db)):
    # SUPER TOKEN BYPASS FOR OFFLINE DEPLOYMENT
    if payload.token == "12345678":
        return {"message": "Super Token verified successfully"}

    result = await db.execute(
        select(VerificationToken)
        .where(VerificationToken.token == payload.token)
        .where(VerificationToken.target == payload.target)
        .where(VerificationToken.token_type == TokenType.email_verification)
        .where(VerificationToken.is_used == 0)
    )
    token_obj = result.scalar_one_or_none()
    
    if not token_obj or not token_obj.is_valid():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    token_obj.is_used = 1
    await db.commit()
    return {"message": "Token verified successfully"}

@router.post("/register/complete")
async def register_complete(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone_number: str = Form(...),
    university_id: str = Form(...),
    faculty_id: int = Form(...),
    department_id: int = Form(...),
    academic_year: int = Form(...),
    id_card: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    regEmail = email.lower()
    user_exists = await db.execute(select(User).where(User.email == regEmail))
    if user_exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    os.makedirs("uploads/id_cards", exist_ok=True)
    file_path = f"uploads/id_cards/{university_id}_{id_card.filename}"
    with open(file_path, "wb") as f:
        f.write(await id_card.read())
        
    pre_result = await db.execute(
        select(PreVerifiedStudent)
        .where(PreVerifiedStudent.university_id == university_id)
    )
    pre_verified = pre_result.scalar_one_or_none()
    
    # Normalize phone number for comparison (remove spaces/dashes)
    clean_phone = phone_number.replace(" ", "").replace("-", "")
    
    # Strict 5-Point Multi-Factor Auto-Approval Check
    is_auto_approved = False
    if pre_verified:
        # Check all critical fields match exactly
        matches = (
            pre_verified.phone_number == clean_phone and
            pre_verified.faculty_id == faculty_id and
            pre_verified.department_id == department_id and
            pre_verified.academic_year == academic_year
        )
        
        if matches:
            is_auto_approved = True
            approved_by_id = pre_verified.created_by_id
            await db.delete(pre_verified) # Remove from allowlist entirely
    
    status_to_set = ApprovalStatus.APPROVED if is_auto_approved else ApprovalStatus.PENDING
    approved_at = datetime.utcnow() if is_auto_approved else None
    
    new_user = User(
        name=name,
        email=regEmail,
        password_hash=hash_password(password),
        role=UserRole.student,
        phone_number=clean_phone,
        password_changed_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    db.add(new_user)
    await db.flush()
    
    rfid_uid = f"REG-{secrets.token_hex(4).upper()}"
    new_student = Student(
        name=name,
        email=regEmail,
        rfid_uid=rfid_uid,
        phone_number=clean_phone,
        university_id=university_id,
        department_id=department_id,
        academic_year=academic_year,
        approval_status=status_to_set,
        approved_at=approved_at,
        approved_by_id=approved_by_id if is_auto_approved else None,
        is_auto_approved=is_auto_approved,
        id_card_image_url=f"/{file_path}"
    )
    db.add(new_student)
    
    # Log registration
    await log_activity(
        db, 
        user_id=new_user.id,
        user_email=new_user.email,
        user_role=new_user.role.value,
        user_name=new_user.name,
        action=ActivityAction.CREATE,
        description=f"New student registration completed: {email} (Status: {status_to_set.value})",
        priority=ActivityPriority.CAUTION,
        target_model="Student",
        target_id=str(new_student.university_id)
    )
    
    await db.commit()
    await db.refresh(new_student)
    
    if status_to_set == ApprovalStatus.APPROVED:
        await enroll_student_in_department_courses(db, new_student.id, department_id)
    
    print(f"\n--- SIMULATED EMAIL ---")
    print(f"To: {email}")
    print(f"Status Change: {status_to_set.value}")
    print(f"-----------------------\n")
    
    return {"message": "Registration complete", "status": status_to_set}

@router.post("/password/forgot")
async def password_forgot(payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    clean_phone = payload.phone_number.replace(" ", "")
    
    # 1. Validate phone number format (must start with 010, 011, 012, or 015 and be 11 digits)
    valid_prefixes = ("010", "011", "012", "015")
    if not clean_phone.startswith(valid_prefixes) or len(clean_phone) != 11:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format. It must start with 010, 011, 012, or 015 and be 11 digits."
        )

    # 2. Check if user exists
    result = await db.execute(select(User).where(User.phone_number == clean_phone))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid number. Make sure you have an account in the system.\n\nNote: New users should visit their University Affairs to confirm acceptance into the system."
        )
        
    token_str = generate_token()
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    token_obj = VerificationToken(
        token=token_str,
        target=clean_phone,
        token_type=TokenType.password_reset,
        expires_at=expires_at
    )
    db.add(token_obj)
    await db.commit()
    
    print(f"\n--- SIMULATED SMS ---")
    print(f"To: {clean_phone}")
    print(f"Message: Your password reset token is {token_str}. Expires in 5 minutes.")
    print(f"-----------------------\n")
    
    # Return token in response for the offline popup system
    return {
        "message": "Reset token generated",
        "debug_token": token_str
    }

@router.post("/password/reset")
async def password_reset(payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    user_result = await db.execute(select(User).where(User.phone_number == payload.phone_number.replace(" ", "")))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    # SUPER TOKEN BYPASS FOR OFFLINE DEPLOYMENT
    if payload.token == "12345678":
        user.password_hash = hash_password(payload.new_password)
        user.password_changed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Log password reset via super token
        await log_activity(
            db, 
            user_id=user.id,
            user_email=user.email,
            user_role=user.role.value,
            user_name=user.name,
            action=ActivityAction.UPDATE,
            description=f"Password reset completed for phone via Super Token: {payload.phone_number}",
            priority=ActivityPriority.WARNING,
            target_model="User",
            target_id=str(user.id)
        )
        await db.commit()
        return {"message": "Password reset successfully using Super Token"}

    result = await db.execute(
        select(VerificationToken)
        .where(VerificationToken.token == payload.token)
        .where(VerificationToken.target == payload.phone_number.replace(" ", ""))
        .where(VerificationToken.token_type == TokenType.password_reset)
        .where(VerificationToken.is_used == 0)
    )
    token_obj = result.scalar_one_or_none()
    
    if not token_obj or not token_obj.is_valid():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    token_obj.is_used = 1
    
    # Log password reset
    await log_activity(
        db, 
        user_id=user.id,
        user_email=user.email,
        user_role=user.role.value,
        user_name=user.name,
        action=ActivityAction.UPDATE,
        description=f"Password reset completed for phone: {payload.phone_number}",
        priority=ActivityPriority.WARNING,
        target_model="User",
        target_id=str(user.id)
    )
    
    await db.commit()
    
    return {"message": "Password reset successfully"}

from app.core.security import get_current_user

@router.post("/profile/image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    os.makedirs("uploads/profiles", exist_ok=True)
    file_path = f"uploads/profiles/{user_id}_{file.filename}"
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    url_path = f"/{file_path}"
    user.profile_image_url = url_path
    await db.commit()
    
    return {"message": "Profile image updated successfully", "profile_image_url": url_path}

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = current_user.get("user_id")
    session_id = current_user.get("session_id")
    
    if user_id and session_id:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            await log_activity(
                db, 
                user_id=user.id,
                user_email=user.email,
                user_role=user.role.value,
                user_name=user.name,
                action=ActivityAction.LOGOUT,
                description=f"User logged out safely",
                priority=ActivityPriority.NORMAL,
                user_avatar=user.profile_image_url,
                session_id=session_id
            )
            await db.commit()
    return {"message": "Logged out successfully"}
