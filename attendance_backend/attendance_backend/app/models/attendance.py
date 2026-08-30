import enum
from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class AttendanceStatus(str, enum.Enum):
    present = "present"
    late = "late"
    absent = "absent"

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    instructor_id = Column(Integer, ForeignKey("instructors.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(Enum(AttendanceStatus, name="attendance_status"), default=AttendanceStatus.present, nullable=False)

    # Prevent duplicate scans for same student in same session
    __table_args__ = (
        UniqueConstraint("student_id", "session_id", name="uq_student_session"),
    )

    student = relationship("Student", back_populates="attendances")
    session = relationship("Session", back_populates="attendances")
    instructor = relationship("Instructor", back_populates="attendances")
