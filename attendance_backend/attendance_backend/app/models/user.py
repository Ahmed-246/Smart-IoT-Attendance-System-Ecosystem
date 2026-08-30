from sqlalchemy import Column, Integer, String, Enum as SAEnum
from app.db.database import Base
import enum


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    doctor = "doctor"
    engineer = "engineer"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    academic_password_hash = Column(String(255), nullable=True) # Used for term transitions
    role = Column(SAEnum(UserRole, name="user_role"), nullable=False, default=UserRole.student)
    phone_number = Column(String(20), nullable=True) # Egyptian Phone Number
    
    # Enrichment
    last_login = Column(String(50), nullable=True) # ISO Timestamp
    password_changed_at = Column(String(50), nullable=True) # ISO Timestamp of last password change
    current_session_id = Column(String(50), nullable=True) # For single-session enforcement
    profile_image_url = Column(String(500), nullable=True)
