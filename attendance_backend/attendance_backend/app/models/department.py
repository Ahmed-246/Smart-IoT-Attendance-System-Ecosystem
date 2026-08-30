from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id", ondelete="CASCADE"), nullable=False)

    faculty = relationship("Faculty", back_populates="departments")
    courses = relationship("Course", back_populates="department", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="department")
    
    # Many-to-Many through association tables
    doctors = relationship("Doctor", secondary="doctor_departments", back_populates="departments")
    instructors = relationship("Instructor", secondary="instructor_departments", back_populates="departments")
