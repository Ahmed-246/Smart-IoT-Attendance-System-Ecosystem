from sqlalchemy import Table, Column, Integer, ForeignKey
from app.db.database import Base


# --- Doctor Associations ---
doctor_faculties = Table(
    "doctor_faculties",
    Base.metadata,
    Column("doctor_id", Integer, ForeignKey("doctors.id", ondelete="CASCADE"), primary_key=True),
    Column("faculty_id", Integer, ForeignKey("faculties.id", ondelete="CASCADE"), primary_key=True),
)

doctor_departments = Table(
    "doctor_departments",
    Base.metadata,
    Column("doctor_id", Integer, ForeignKey("doctors.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True),
)


# --- Instructor Associations ---
instructor_faculties = Table(
    "instructor_faculties",
    Base.metadata,
    Column("instructor_id", Integer, ForeignKey("instructors.id", ondelete="CASCADE"), primary_key=True),
    Column("faculty_id", Integer, ForeignKey("faculties.id", ondelete="CASCADE"), primary_key=True),
)

instructor_departments = Table(
    "instructor_departments",
    Base.metadata,
    Column("instructor_id", Integer, ForeignKey("instructors.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True),
)
