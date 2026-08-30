from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base


class TermConfig(Base):
    """
    Global singleton table holding the current term state.
    Only one row (id=1) should ever exist.
    """
    __tablename__ = "term_config"

    id = Column(Integer, primary_key=True, default=1)
    academic_year_label = Column(String(50), nullable=False, default="2025/2026")
    current_year_start = Column(Integer, nullable=False, default=2025)
    current_semester = Column(Integer, nullable=False, default=1)  # 1 or 2
    is_locked = Column(Boolean, nullable=False, default=False)
    system_logo_url = Column(String(500), nullable=True)
