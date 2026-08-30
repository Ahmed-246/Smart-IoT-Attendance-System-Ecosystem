from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from app.db.database import Base
import enum
import datetime

class TokenType(str, enum.Enum):
    email_verification = "email_verification"
    password_reset = "password_reset"

class VerificationToken(Base):
    __tablename__ = "verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(8), unique=True, nullable=False, index=True) # 8-character token
    target = Column(String(255), nullable=False, index=True) # email or phone number
    token_type = Column(SAEnum(TokenType, name="token_type"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Integer, default=0) # 0 for false, 1 for true

    def is_valid(self) -> bool:
        return self.is_used == 0 and datetime.datetime.utcnow() < self.expires_at
