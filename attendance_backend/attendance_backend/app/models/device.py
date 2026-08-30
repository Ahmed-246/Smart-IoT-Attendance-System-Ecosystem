from sqlalchemy import Column, Integer, String, DateTime
from app.db.database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(100), nullable=True)
    mac_address = Column(String(50), unique=True, index=True, nullable=True)
    api_key = Column(String(255), unique=True, nullable=True, index=True)
    location = Column(String(255), nullable=True)
    last_seen = Column(DateTime, nullable=True)
    is_active = Column(Integer, default=0) # 0: Pending, 1: Active, -1: Blocked
