from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from app.db.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    course_code = Column(String(20), unique=True, nullable=True, index=True)  # e.g. "MED-101"
    description = Column(Text, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id", ondelete="SET NULL"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    drive_link = Column(String(500), nullable=True)
    weekly_schedule = Column(Text, nullable=True)  # JSON string e.g. '{"Sun":"10:00-12:00","Tue":"14:00-16:00"}'
    max_score = Column(Float, nullable=False, default=100.0)
    academic_year = Column(Integer, nullable=True)
    semester = Column(Integer, default=1, nullable=False)
    credits = Column(Float, default=3.0, nullable=False)
    passing_score = Column(Float, default=60.0, nullable=False)

    # Course series / prerequisite chain (self-referencing)
    parent_course_id = Column(Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    tier_level = Column(Integer, default=1, nullable=False)  # 1=standalone or first in series, 2=second, etc.
    is_elective = Column(Boolean, default=False, nullable=False)
    has_practical = Column(Boolean, default=False, nullable=False)
    assessment_blueprint = Column(Text, nullable=True)  # JSON string of expected assessments/weights

    department = relationship("Department", back_populates="courses")
    instructor = relationship("Instructor", back_populates="courses")
    doctor = relationship("Doctor", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="course", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="course", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="course", cascade="all, delete-orphan")

    # Self-referencing: parent → children
    parent_course = relationship("Course", remote_side=[id], backref="sub_courses", foreign_keys=[parent_course_id])

