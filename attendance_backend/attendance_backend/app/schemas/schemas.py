from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole
from app.models.grade import GradeType
from app.models.assessment import AssessmentType


# ─── Auth ────────────────────────────────────────────────────────────────────

def validate_egypt_phone(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    # Clean the number
    clean_v = v.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if len(clean_v) != 11:
        raise ValueError("Phone number must be exactly 11 digits")
    if not any(clean_v.startswith(prefix) for prefix in ["010", "011", "012", "015"]):
        raise ValueError("Invalid Egyptian phone prefix. Must start with 010, 011, 012, or 015")
    if not clean_v.isdigit():
        raise ValueError("Phone number must contain only digits")
    return clean_v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    name: Optional[str] = None
    student_id: Optional[int] = None
    instructor_id: Optional[int] = None
    doctor_id: Optional[int] = None
    profile_image_url: Optional[str] = None
    assigned_department_ids: List[int] = []
    assigned_faculty_ids: List[int] = []
    capabilities: List[str] = []


# ─── Verification & Registration ──────────────────────────────────────────────

class RegistrationInit(BaseModel):
    name: str
    email: EmailStr

class TokenVerification(BaseModel):
    target: str
    token: str

class PasswordResetRequest(BaseModel):
    phone_number: str

class PasswordResetConfirm(BaseModel):
    phone_number: str
    token: str
    new_password: str = Field(min_length=6)

class PreVerifiedStudentCreate(BaseModel):
    university_id: str
    name: str
    phone_number: Optional[str] = None
    faculty_id: Optional[int] = None
    department_id: Optional[int] = None
    academic_year: Optional[int] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v):
        return validate_egypt_phone(v)

class PreVerifiedStudentOut(BaseModel):
    id: int
    university_id: str
    name: str
    phone_number: Optional[str] = None
    faculty_id: Optional[int] = None
    department_id: Optional[int] = None
    faculty_name: Optional[str] = None
    department_name: Optional[str] = None
    academic_year: Optional[int] = None
    is_claimed: bool = False
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class ApprovalUpdate(BaseModel):
    status: str

class RejectionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)



# ─── User ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    password: str = Field(min_length=6)
    academic_password: Optional[str] = Field(default=None, min_length=6)
    role: UserRole = UserRole.student
    phone_number: Optional[str] = None
    profile_image_url: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v):
        return validate_egypt_phone(v)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)
    academic_password: Optional[str] = Field(default=None, min_length=6)
    role: Optional[UserRole] = None
    phone_number: Optional[str] = None
    profile_image_url: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_egyptian_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        clean_v = v.replace(" ", "").replace("-", "")
        if len(clean_v) != 11:
            raise ValueError("Phone number must be exactly 11 digits")
        if not any(clean_v.startswith(prefix) for prefix in ["010", "011", "012", "015"]):
            raise ValueError("Invalid Egyptian phone prefix. Must start with 010, 011, 012, or 015")
        if not clean_v.isdigit():
            raise ValueError("Phone number must contain only digits")
        return clean_v

class UserOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: str
    role: UserRole
    phone_number: Optional[str] = None
    last_login: Optional[str] = None
    profile_image_url: Optional[str] = None
    model_config = {"from_attributes": True}


# ─── Faculty ─────────────────────────────────────────────────────────────────

class FacultyBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    total_years: int = Field(default=4, ge=1, le=8)
    semesters_per_year: int = Field(default=2, ge=1, le=3)

class FacultyCreate(FacultyBase):
    pass

class FacultyUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    total_years: Optional[int] = Field(default=None, ge=1, le=8)
    semesters_per_year: Optional[int] = Field(default=None, ge=1, le=3)

class FacultyOut(FacultyBase):
    id: int
    model_config = {"from_attributes": True}


# ─── Department ──────────────────────────────────────────────────────────────

class DepartmentBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    faculty_id: int

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    faculty_id: Optional[int] = None

class DepartmentOut(DepartmentBase):
    id: int
    model_config = {"from_attributes": True}


# ─── Student ─────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    rfid_uid: str = Field(min_length=4, max_length=100)
    university_id: Optional[str] = None
    department_id: Optional[int] = None
    academic_year: Optional[int] = Field(default=None, ge=1, le=6)
    current_semester: Optional[int] = Field(default=1, ge=1, le=2)
    academic_status: Optional[str] = "ACTIVE"
    phone_number: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    bio: Optional[str] = None
    personal_email: Optional[EmailStr] = None

    @field_validator("phone_number", "emergency_contact_phone")
    @classmethod
    def validate_phone(cls, v):
        return validate_egypt_phone(v)

class StudentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    rfid_uid: Optional[str] = Field(default=None, min_length=4, max_length=100)
    university_id: Optional[str] = None
    department_id: Optional[int] = None
    academic_year: Optional[int] = Field(default=None, ge=1, le=6)
    current_semester: Optional[int] = Field(default=None, ge=1, le=2)
    academic_status: Optional[str] = None
    phone_number: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    bio: Optional[str] = None
    personal_email: Optional[EmailStr] = None

    @field_validator("phone_number", "emergency_contact_phone")
    @classmethod
    def validate_egyptian_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        clean_v = v.replace(" ", "").replace("-", "")
        if len(clean_v) != 11:
            raise ValueError("Phone number must be exactly 11 digits")
        if not any(clean_v.startswith(prefix) for prefix in ["010", "011", "012", "015"]):
            raise ValueError("Invalid Egyptian phone prefix. Must start with 010, 011, 012, or 015")
        if not clean_v.isdigit():
            raise ValueError("Phone number must contain only digits")
        return clean_v

class StudentOut(BaseModel):
    id: int
    name: str
    email: str
    rfid_uid: str
    university_id: Optional[str] = None
    department_id: Optional[int] = None
    academic_year: Optional[int] = None
    current_semester: Optional[int] = None
    academic_status: Optional[str] = None
    phone_number: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    bio: Optional[str] = None
    personal_email: Optional[str] = None
    is_blacklisted: bool = False
    blacklist_reason: Optional[str] = None
    id_card_image_url: Optional[str] = None
    approval_status: Optional[str] = None
    faculty_name: Optional[str] = None
    department_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejected_by_id: Optional[int] = None
    rejected_by_name: Optional[str] = None
    
    approved_at: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    approved_by_name: Optional[str] = None
    profile_image_url: Optional[str] = None

    model_config = {"from_attributes": True}

class BlacklistRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)

class StudentProfileOut(BaseModel):
    """Rich student profile for the detail page."""
    student: StudentOut
    attendance_percentage: float
    academic_performance: float = 0.0  # Weighted average across all courses
    total_sessions: int
    attended_sessions: int
    total_credits: float = 0.0
    faculty_name: Optional[str] = None
    department_name: Optional[str] = None
    enrolled_courses: list = []       # list of CourseOut-like dicts
    active_sessions: list = []        # list of Session dicts
    grades: list = []                 # list of GradeOut (legacy)
    committed_grades: list = []       # list of GradeResult dicts from gradebook
    attendance_history: list = []     # list of attendance records


# ─── Instructor ───────────────────────────────────────────────────────────────

class InstructorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    title: Optional[str] = "Eng."
    faculty_ids: List[int] = []
    department_ids: List[int] = []
    phone_number: Optional[str] = None
    specialization: Optional[str] = None
    office_hours: Optional[str] = None
    bio: Optional[str] = None
    appointment_link: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_egyptian_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        clean_v = v.replace(" ", "").replace("-", "")
        if len(clean_v) != 11:
            raise ValueError("Phone number must be exactly 11 digits")
        if not any(clean_v.startswith(prefix) for prefix in ["010", "011", "012", "015"]):
            raise ValueError("Invalid Egyptian phone prefix. Must start with 010, 011, 012, or 015")
        if not clean_v.isdigit():
            raise ValueError("Phone number must contain only digits")
        return clean_v

class InstructorUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    title: Optional[str] = None
    faculty_ids: Optional[List[int]] = None
    department_ids: Optional[List[int]] = None
    phone_number: Optional[str] = None
    specialization: Optional[str] = None
    office_hours: Optional[str] = None
    bio: Optional[str] = None
    appointment_link: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_egyptian_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        clean_v = v.replace(" ", "").replace("-", "")
        if len(clean_v) != 11:
            raise ValueError("Phone number must be exactly 11 digits")
        if not any(clean_v.startswith(prefix) for prefix in ["010", "011", "012", "015"]):
            raise ValueError("Invalid Egyptian phone prefix. Must start with 010, 011, 012, or 015")
        if not clean_v.isdigit():
            raise ValueError("Phone number must contain only digits")
        return clean_v

class CapabilityOut(BaseModel):
    capability_name: str
    expires_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class InstructorOut(BaseModel):
    id: int
    name: str
    email: str
    title: Optional[str] = None
    phone_number: Optional[str] = None
    specialization: Optional[str] = None
    office_hours: Optional[str] = None
    bio: Optional[str] = None
    appointment_link: Optional[str] = None
    faculties: List[FacultyOut] = []
    departments: List[DepartmentOut] = []
    profile_image_url: Optional[str] = None
    capabilities: List[CapabilityOut] = []
    model_config = {"from_attributes": True}

class InstructorProfileOut(BaseModel):
    instructor: InstructorOut
    assigned_courses: list = [] # list of course dicts


# ─── Doctor ───────────────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    title: Optional[str] = "Dr."
    faculty_ids: List[int] = []
    department_ids: List[int] = []
    phone_number: Optional[str] = None
    specialization: Optional[str] = None
    office_hours: Optional[str] = None
    bio: Optional[str] = None
    appointment_link: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_egyptian_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        clean_v = v.replace(" ", "").replace("-", "")
        if len(clean_v) != 11:
            raise ValueError("Phone number must be exactly 11 digits")
        if not any(clean_v.startswith(prefix) for prefix in ["010", "011", "012", "015"]):
            raise ValueError("Invalid Egyptian phone prefix. Must start with 010, 011, 012, or 015")
        if not clean_v.isdigit():
            raise ValueError("Phone number must contain only digits")
        return clean_v

class DoctorUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    title: Optional[str] = None
    faculty_ids: Optional[List[int]] = None
    department_ids: Optional[List[int]] = None
    phone_number: Optional[str] = None
    specialization: Optional[str] = None
    office_hours: Optional[str] = None
    bio: Optional[str] = None
    appointment_link: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_egyptian_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        clean_v = v.replace(" ", "").replace("-", "")
        if len(clean_v) != 11:
            raise ValueError("Phone number must be exactly 11 digits")
        if not any(clean_v.startswith(prefix) for prefix in ["010", "011", "012", "015"]):
            raise ValueError("Invalid Egyptian phone prefix. Must start with 010, 011, 012, or 015")
        if not clean_v.isdigit():
            raise ValueError("Phone number must contain only digits")
        return clean_v

class DoctorOut(BaseModel):
    id: int
    name: str
    email: str
    title: Optional[str] = None
    phone_number: Optional[str] = None
    specialization: Optional[str] = None
    office_hours: Optional[str] = None
    bio: Optional[str] = None
    appointment_link: Optional[str] = None
    faculties: List[FacultyOut] = []
    departments: List[DepartmentOut] = []
    profile_image_url: Optional[str] = None
    capabilities: List[CapabilityOut] = []
    model_config = {"from_attributes": True}

class DoctorProfileOut(BaseModel):
    doctor: DoctorOut
    assigned_courses: list = [] # list of course dicts



# ─── Course ───────────────────────────────────────────────────────────────────
class AssessmentBlueprintItem(BaseModel):
    title: str
    assessment_type: AssessmentType
    weight_pct: float
    template_key: str
    enabled: bool = True

class CourseCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    course_code: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    department_id: Optional[int] = None
    instructor_id: Optional[int] = None
    doctor_id: Optional[int] = None
    drive_link: Optional[str] = None
    weekly_schedule: Optional[str] = None
    academic_year: Optional[int] = Field(default=None, ge=1, le=8)
    max_score: float = Field(default=100.0, gt=0)
    semester: int = Field(default=1, ge=1, le=2)
    credits: float = Field(default=3.0, gt=0)
    passing_score: float = Field(default=60.0, ge=0)
    parent_course_id: Optional[int] = None
    tier_level: int = Field(default=1, ge=1)
    is_elective: bool = False
    has_practical: bool = False
    assessment_blueprint: Optional[List[AssessmentBlueprintItem]] = None

class CourseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    course_code: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = None
    department_id: Optional[int] = None
    instructor_id: Optional[int] = None
    doctor_id: Optional[int] = None
    drive_link: Optional[str] = None
    weekly_schedule: Optional[str] = None
    academic_year: Optional[int] = Field(default=None, ge=1, le=8)
    max_score: Optional[float] = Field(default=None, gt=0)
    semester: Optional[int] = Field(default=None, ge=1, le=2)
    credits: Optional[float] = Field(default=None, gt=0)
    passing_score: Optional[float] = Field(default=None, ge=0)
    parent_course_id: Optional[int] = None
    tier_level: Optional[int] = Field(default=None, ge=1)
    is_elective: Optional[bool] = None
    has_practical: Optional[bool] = None
    assessment_blueprint: Optional[List[AssessmentBlueprintItem]] = None

class CourseOut(BaseModel):
    id: int
    name: str
    course_code: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[int] = None
    instructor_id: Optional[int] = None
    doctor_id: Optional[int] = None
    drive_link: Optional[str] = None
    weekly_schedule: Optional[str] = None
    academic_year: Optional[int] = None
    max_score: float = 100.0
    semester: int = 1
    credits: float = 3.0
    passing_score: float = 60.0
    parent_course_id: Optional[int] = None
    tier_level: int = 1
    is_elective: bool = False
    has_practical: bool = False
    assessment_blueprint: Optional[str] = None # JSON string from DB
    model_config = {"from_attributes": True}

class CourseDetailOut(BaseModel):
    """Rich course detail for the detail page."""
    course: CourseOut
    faculty_name: Optional[str] = None
    department_name: Optional[str] = None
    instructor_name: Optional[str] = None
    doctor_name: Optional[str] = None
    enrolled_students: list = []
    attendance_rate: float = 0.0
    total_sessions: int = 0
    blacklisted_students: list = []
    prerequisite_course: Optional[dict] = None  # {id, name, course_code} of parent
    sub_courses: list = []  # list of {id, name, course_code, tier_level, academic_year, semester}
    assessments: list = []  # list of AssessmentOut-like dicts


# ─── Enrollment ───────────────────────────────────────────────────────────────

class EnrollmentCreate(BaseModel):
    student_id: int
    course_id: int

class EnrollmentOut(BaseModel):
    id: int
    student_id: int
    course_id: int
    enrolled_at: datetime
    status: str = "ACTIVE"
    academic_year_snapshot: Optional[int] = None
    model_config = {"from_attributes": True}


# ─── Grade ────────────────────────────────────────────────────────────────────

class GradeCreate(BaseModel):
    student_id: int
    course_id: int
    title: str = Field(min_length=1, max_length=255)
    grade_type: GradeType = GradeType.quiz
    score: float = Field(ge=0)
    max_score: float = Field(default=100.0, gt=0)

class GradeOut(BaseModel):
    id: int
    student_id: int
    course_id: int
    title: str
    grade_type: str
    score: float
    max_score: float
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Session ─────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    course_id: int
    instructor_id: Optional[int] = None

class SessionOut(BaseModel):
    id: int
    course_id: int
    instructor_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool
    model_config = {"from_attributes": True}


# ─── Attendance ───────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    rfid_uid: str

class ScanResponse(BaseModel):
    status: str
    student: str
    session: str
    timestamp: datetime

class AttendanceOut(BaseModel):
    id: int
    student_id: int
    session_id: int
    instructor_id: Optional[int] = None
    timestamp: datetime
    status: str
    model_config = {"from_attributes": True}

class AttendanceReportRecord(BaseModel):
    student_id: int
    student_name: str
    university_id: Optional[str] = None
    department_name: Optional[str] = None
    timestamp: Optional[datetime] = None
    status: str # "present", "absent", "late"
    model_config = {"from_attributes": True}

class AttendanceReport(BaseModel):
    session_id: int
    course_name: str
    total_students: int
    present: int
    absent: int
    attendance_rate: float
    records: List[AttendanceReportRecord]


# ─── Device ───────────────────────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    device_name: str = Field(min_length=2, max_length=100)
    location: Optional[str] = None
    api_key: Optional[str] = None

class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    location: Optional[str] = None
    api_key: Optional[str] = None

class DeviceOut(BaseModel):
    id: int
    device_name: str
    api_key: str
    location: Optional[str] = None
    last_seen: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── AI ───────────────────────────────────────────────────────────────────────

class AIQuery(BaseModel):
    question: str = Field(min_length=1)
    message_count: int = Field(default=0, ge=0)

class AIResponse(BaseModel):
    answer: str
    suggestions: Optional[List[str]] = None
    intent: Optional[str] = None
    confidence: Optional[float] = None
    persona: str = "Personal"
    session_expired: bool = False
    remaining_messages: int = 10

# ─── Dashboard Telemetry ──────────────────────────────────────────────────────

class GlobalStatsOut(BaseModel):
    total_students: int
    student_trend: float  # e.g., +2.5
    active_scanners: int
    total_scanners: int
    uptime_pct: float
    alerts_count: int
    total_faculties: int
    total_departments: int
    total_courses: int

class ActivityFeedItem(BaseModel):
    id: str  # Use string for composite IDs
    type: str # "scan", "alert", "update"
    title: str
    subtitle: str
    timestamp: datetime
    icon_type: str # "check", "warning", "info", "error"
