from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base

class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    
    # Emergency Operations
    is_locked = Column(Boolean, default=False)
    
    # Regional & Chronology (Startup Settings)
    academic_year_start = Column(Integer, default=2025)
    academic_year_end = Column(Integer, default=2026)
    current_semester = Column(Integer, default=2)
    
    # Governance
    log_retention_days = Column(Integer, default=30)
