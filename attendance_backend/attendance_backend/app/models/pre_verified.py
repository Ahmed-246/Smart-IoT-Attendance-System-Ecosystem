from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.db.database import Base

class PreVerifiedStudent(Base):
    __tablename__ = "pre_verified_students"

    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True)
    faculty_id = Column(Integer, nullable=True)
    department_id = Column(Integer, nullable=True)
    academic_year = Column(Integer, nullable=True)
    is_claimed = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
