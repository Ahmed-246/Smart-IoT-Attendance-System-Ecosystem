from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class AcademicStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PROBATION = "PROBATION"
    REPEATER = "REPEATER"
    DISMISSED = "DISMISSED"
    GRADUATED = "GRADUATED"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    rfid_uid = Column(String(100), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=True) # Egyptian Phone Number

    # Extended profile fields
    university_id = Column(String(50), unique=True, nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    academic_year = Column(Integer, nullable=True)  # 1, 2, 3, 4, 5, 6
    current_semester = Column(Integer, default=1, nullable=False) # 1 or 2
    academic_status = Column(SAEnum(AcademicStatus, name="academic_status_enum"), default=AcademicStatus.ACTIVE, nullable=False)

    # Verification
    id_card_image_url = Column(String(500), nullable=True)
    approval_status = Column(SAEnum(ApprovalStatus, name="approval_status_enum"), default=ApprovalStatus.PENDING, nullable=False)

    # Enrichment
    emergency_contact_phone = Column(String(20), nullable=True)
    bio = Column(Text, nullable=True)
    personal_email = Column(String(255), nullable=True)

    department = relationship("Department", back_populates="students")

    # Blacklist
    is_blacklisted = Column(Boolean, default=False, nullable=False)
    blacklist_reason = Column(Text, nullable=True)

    # Rejection tracking
    rejection_reason = Column(Text, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejected_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Approval tracking
    approved_at = Column(DateTime, nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_auto_approved = Column(Boolean, default=False, nullable=False)
    admin_seen_auto_approve = Column(Boolean, default=False, nullable=False)
    auto_approve_history_cleared = Column(Boolean, default=False, nullable=False)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="student", cascade="all, delete-orphan")
    grade_results = relationship("GradeResult", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    academic_records = relationship("AcademicRecord", back_populates="student", cascade="all, delete-orphan")
