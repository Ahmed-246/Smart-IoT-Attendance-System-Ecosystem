from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.database import Base


class Instructor(Base):
    __tablename__ = "instructors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(50), nullable=True, default="Eng.")  # Eng., TA, etc.
    phone_number = Column(String(20), nullable=True) # Egyptian Phone Number

    # Enrichment
    specialization = Column(String(255), nullable=True)
    office_hours = Column(String(500), nullable=True)
    bio = Column(String(1000), nullable=True)
    appointment_link = Column(String(500), nullable=True)

    courses = relationship("Course", back_populates="instructor")
    faculties = relationship("Faculty", secondary="instructor_faculties", back_populates="instructors")
    departments = relationship("Department", secondary="instructor_departments", back_populates="instructors")
    sessions = relationship("Session", back_populates="instructor")
    attendances = relationship("Attendance", back_populates="instructor")
