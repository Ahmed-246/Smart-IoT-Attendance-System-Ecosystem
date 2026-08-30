from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


class Faculty(Base):
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    total_years = Column(Integer, nullable=False, default=4)       # 4, 5, or 6 year program
    semesters_per_year = Column(Integer, nullable=False, default=2) # Always 2

    departments = relationship("Department", back_populates="faculty", cascade="all, delete-orphan")
    
    # Many-to-Many through association tables
    doctors = relationship("Doctor", secondary="doctor_faculties", back_populates="faculties")
    instructors = relationship("Instructor", secondary="instructor_faculties", back_populates="faculties")
