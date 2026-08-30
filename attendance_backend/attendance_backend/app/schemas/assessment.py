from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime, timezone
from app.models.assessment import AssessmentType


class AssessmentBase(BaseModel):
    title: str
    course_code: int
    assessment_type: AssessmentType
    max_score: float
    status: str = "Scheduled"
    scheduled_date: Optional[datetime] = None
    hall: Optional[str] = None
    academic_year: Optional[int] = None
    template_key: Optional[str] = None
    instructor_id: Optional[int] = None


class AssessmentCreate(AssessmentBase):
    @field_validator("scheduled_date")
    @classmethod
    def date_not_in_past(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v < datetime.now(timezone.utc):
            if v.date() < datetime.now(timezone.utc).date():
                raise ValueError("Assessment date cannot be in the past")
        return v


class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    course_code: Optional[int] = None
    assessment_type: Optional[AssessmentType] = None
    max_score: Optional[float] = None
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    hall: Optional[str] = None
    academic_year: Optional[int] = None
    template_key: Optional[str] = None
    instructor_id: Optional[int] = None


class AssessmentOut(AssessmentBase):
    id: int
    weight_pct: float
    date_assigned: datetime
    instructor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssessmentStatusUpdate(BaseModel):
    status: str
