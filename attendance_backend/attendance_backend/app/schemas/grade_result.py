from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List


class GradeResultBase(BaseModel):
    assessment_id: int
    student_id: int
    raw_score: float
    instructor_remarks: Optional[str] = None
    is_flagged: bool = False
    is_absent: bool = False


class GradeResultCreate(GradeResultBase):
    pass


class GradeResultUpdate(BaseModel):
    raw_score: Optional[float] = None
    instructor_remarks: Optional[str] = None
    is_flagged: Optional[bool] = None
    is_absent: Optional[bool] = None


class GradeResultOut(GradeResultBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class GradeBulkUpdate(BaseModel):
    student_id: int
    raw_score: float
    instructor_remarks: Optional[str] = None
    is_flagged: bool = False
    is_absent: bool = False


class GradeBulkCommit(BaseModel):
    grades: List[GradeBulkUpdate]
    finalize: bool = True
    instructor_id: Optional[int] = None
