from sqlalchemy import Column, Integer, String, DateTime, JSON, Enum as SAEnum, func
from app.db.database import Base
from datetime import datetime
import enum

class ActivityPriority(str, enum.Enum):
    NORMAL = "NORMAL"     # Green
    CAUTION = "CAUTION"   # Yellow
    WARNING = "WARNING"   # Orange
    CRITICAL = "CRITICAL" # Red

class ActivityAction(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    SYSTEM = "SYSTEM"
    ACCESS_DENIED = "ACCESS_DENIED"

class SystemActivity(Base):
    __tablename__ = "system_activities"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    session_id = Column(String(255), index=True, nullable=True)
    
    # User info (denormalized for display speed)
    user_id = Column(Integer, index=True)
    user_email = Column(String(255))
    user_role = Column(String(50))
    user_name = Column(String(255), nullable=True)
    user_avatar = Column(String(500), nullable=True)
    
    # Action info
    action_type = Column(SAEnum(ActivityAction), nullable=False)
    priority = Column(SAEnum(ActivityPriority), default=ActivityPriority.NORMAL)
    
    # Target info
    target_model = Column(String(100), index=True) # e.g., 'Student', 'Faculty'
    target_id = Column(String(100), nullable=True) # ID of target object
    
    # Description & Details
    description = Column(String(500))
    details_json = Column(JSON, nullable=True) # Stores old/new values { "old": {...}, "new": {...} }

    # IP / Client info (optional)
    ip_address = Column(String(50), nullable=True)

class TelemetryAction(str, enum.Enum):
    NAVIGATE = "NAVIGATE"
    FILTER = "FILTER"
    VIEW = "VIEW"
    ACTION = "ACTION"

class SessionTelemetry(Base):
    __tablename__ = "session_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    action_type = Column(SAEnum(TelemetryAction), nullable=False)
    path = Column(String(255), nullable=True) 
    description = Column(String(500))
    details_json = Column(JSON, nullable=True)

