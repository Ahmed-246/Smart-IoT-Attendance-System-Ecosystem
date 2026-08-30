from sqlalchemy import Column, Integer, Float, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class GradeResult(Base):
    __tablename__ = "grade_results"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    raw_score = Column(Float, nullable=False, default=0.0)
    instructor_remarks = Column(String(1000), nullable=True)
    is_flagged = Column(Boolean, nullable=False, default=False)
    is_absent = Column(Boolean, nullable=False, default=False)
    created_by_doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    assessment = relationship("Assessment", back_populates="grade_results")
    student = relationship("Student", back_populates="grade_results")
    creator = relationship("Doctor")
