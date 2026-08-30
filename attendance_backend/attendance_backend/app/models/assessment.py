import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class AssessmentType(str, enum.Enum):
    midterm = "Midterm"
    quiz = "Quiz"
    final = "Final"
    practical = "Practical"


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    course_code = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    assessment_type = Column(SAEnum(AssessmentType, name="assessment_type_enum"), nullable=False, default=AssessmentType.quiz)
    max_score = Column(Float, nullable=False, default=100.0)
    weight_pct = Column(Float, nullable=False, default=0.0)
    date_assigned = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    hall = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="Waiting")  # Waiting, Active, Finished
    academic_year = Column(Integer, nullable=True)
    template_key = Column(String(50), nullable=True)  # e.g. quiz_1, midterm, practical, final
    instructor_id = Column(Integer, ForeignKey("instructors.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    course = relationship("Course", back_populates="assessments")
    instructor = relationship("Instructor")
    grade_results = relationship("GradeResult", back_populates="assessment", cascade="all, delete-orphan")
