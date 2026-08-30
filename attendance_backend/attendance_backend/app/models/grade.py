import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class GradeType(str, enum.Enum):
    quiz = "quiz"
    midterm = "midterm"
    final = "final"
    assignment = "assignment"


class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)  # "Quiz 1", "Midterm Exam", etc.
    grade_type = Column(SAEnum(GradeType, name="grade_type"), nullable=False, default=GradeType.quiz)
    score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False, default=100.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("Student", back_populates="grades")
    course = relationship("Course", back_populates="grades")
