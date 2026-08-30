from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class AcademicRecord(Base):
    __tablename__ = "academic_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    
    # Calculated statistics at this point in time
    weighted_average = Column(Float, nullable=False, default=0.0)
    total_credits = Column(Float, nullable=False, default=0.0)
    failed_courses = Column(Integer, nullable=False, default=0)
    
    # Status decided at the end of the year (PROMOTED, CARRY_OVER, REPEATER)
    status_at_time = Column(String(50), nullable=False)
    
    # Detailed tracking of failed courses for transcript accuracy
    failed_courses_json = Column(String(1000), nullable=True) # Serialized list of names
    
    # ── Enriched Audit Trail Fields ─────────────────────────────
    academic_year_label = Column(String(50), nullable=True)   # e.g. "2025/2026"
    year_level = Column(Integer, nullable=True)               # Student's year level at the time
    result_type = Column(String(30), nullable=True)           # PROMOTED, CARRY_OVER, REPEATER, RESIT_PASSED, GRADUATED, DISMISSED
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("Student", back_populates="academic_records")
