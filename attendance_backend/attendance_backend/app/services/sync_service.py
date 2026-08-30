from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

async def sync_profile_to_user(db: AsyncSession, email: str, profile_obj=None):
    """
    Updates the User record from a specialized profile (Student, Doctor, or Instructor).
    If profile_obj is not provided, it will be searched for based on the user's role.
    """
    from app.models.user import User, UserRole
    from app.models.student import Student
    from app.models.doctor import Doctor
    from app.models.instructor import Instructor

    # 1. Get the User
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        return None

    # 2. Find the specialized profile if not provided
    if not profile_obj:
        if user.role == UserRole.student:
            res = await db.execute(select(Student).where(Student.email == email))
            profile_obj = res.scalar_one_or_none()
        elif user.role == UserRole.doctor:
            res = await db.execute(select(Doctor).where(Doctor.email == email))
            profile_obj = res.scalar_one_or_none()
        elif user.role == UserRole.engineer:
            res = await db.execute(select(Instructor).where(Instructor.email == email))
            profile_obj = res.scalar_one_or_none()

    # 3. Synchronize fields
    if profile_obj:
        user.name = profile_obj.name
        user.phone_number = profile_obj.phone_number
        # Email is already matched
        await db.flush()
    
    return user

async def sync_user_to_profile(db: AsyncSession, user_id: int):
    """
    Propagates User fields (name, email, phone_number) to the linked specialized profile.
    """
    from app.models.user import User, UserRole
    from app.models.student import Student
    from app.models.doctor import Doctor
    from app.models.instructor import Instructor

    # 1. Get the User
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        return None

    profile_obj = None
    
    # 2. Find and update the profile
    if user.role == UserRole.student:
        res = await db.execute(select(Student).where(Student.email == user.email))
        profile_obj = res.scalar_one_or_none()
        if profile_obj:
            profile_obj.name = user.name
            profile_obj.phone_number = user.phone_number
            profile_obj.email = user.email
    elif user.role == UserRole.doctor:
        res = await db.execute(select(Doctor).where(Doctor.email == user.email))
        profile_obj = res.scalar_one_or_none()
        if profile_obj:
            profile_obj.name = user.name
            profile_obj.phone_number = user.phone_number
            profile_obj.email = user.email
    elif user.role == UserRole.engineer:
        res = await db.execute(select(Instructor).where(Instructor.email == user.email))
        profile_obj = res.scalar_one_or_none()
        if profile_obj:
            profile_obj.name = user.name
            profile_obj.phone_number = user.phone_number
            profile_obj.email = user.email

    if profile_obj:
        await db.flush()
        
    return profile_obj

async def ensure_profile_exists(db: AsyncSession, user_obj):
    """
    Ensures that a specialized profile exists for a user with Student/Doctor/Engineer role.
    Initializes a basic profile if missing.
    """
    from app.models.user import UserRole
    from app.models.student import Student, ApprovalStatus
    from app.models.doctor import Doctor
    from app.models.instructor import Instructor
    import secrets

    if user_obj.role == UserRole.student:
        res = await db.execute(select(Student).where(Student.email == user_obj.email))
        if not res.scalar_one_or_none():
            student = Student(
                name=user_obj.name or "Unknown Student",
                email=user_obj.email,
                phone_number=user_obj.phone_number,
                rfid_uid=f"AUTO-{secrets.token_hex(4).upper()}",
                approval_status=ApprovalStatus.PENDING
            )
            db.add(student)
            
    elif user_obj.role == UserRole.doctor:
        res = await db.execute(select(Doctor).where(Doctor.email == user_obj.email))
        if not res.scalar_one_or_none():
            doctor = Doctor(
                name=user_obj.name or "Unknown Doctor",
                email=user_obj.email,
                phone_number=user_obj.phone_number
            )
            db.add(doctor)
            
    elif user_obj.role == UserRole.engineer:
        res = await db.execute(select(Instructor).where(Instructor.email == user_obj.email))
        if not res.scalar_one_or_none():
            instructor = Instructor(
                name=user_obj.name or "Unknown Engineer",
                email=user_obj.email,
                phone_number=user_obj.phone_number
            )
            db.add(instructor)
    
    await db.flush()
