from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, FAILED, DROPPED
    academic_year_snapshot = Column(Integer, nullable=True)  # Student's year level when enrolled

    # ── Archival / Versioning Fields ────────────────────────────
    is_current = Column(Boolean, default=True, nullable=False)
    semester_snapshot = Column(Integer, nullable=True)          # 1 or 2 at time of enrollment
    final_percentage = Column(Float, nullable=True)             # Stamped at archival time
    result = Column(String(30), nullable=True)                  # PASSED, FAILED, RESIT_PASSED
    attendance_exception = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", "academic_year_snapshot", "semester_snapshot",
                         name="uq_student_course_year_sem"),
    )

    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

