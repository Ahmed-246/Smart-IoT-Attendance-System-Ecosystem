from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(50), nullable=True, default="Dr.")  # Dr., Prof., etc.
    phone_number = Column(String(20), nullable=True) # Egyptian Phone Number

    # Enrichment
    specialization = Column(String(255), nullable=True)
    office_hours = Column(String(500), nullable=True)
    bio = Column(String(1000), nullable=True)
    appointment_link = Column(String(500), nullable=True)

    courses = relationship("Course", back_populates="doctor")
    faculties = relationship("Faculty", secondary="doctor_faculties", back_populates="doctors")
    departments = relationship("Department", secondary="doctor_departments", back_populates="doctors")
