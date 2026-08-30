from app.models.user import User, UserRole
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.doctor import Doctor
from app.models.faculty import Faculty
from app.models.department import Department
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.grade import Grade, GradeType
from app.models.session import Session
from app.models.attendance import Attendance
from app.models.device import Device
from app.models.associations import doctor_faculties, doctor_departments, instructor_faculties, instructor_departments
from app.models.assessment import Assessment, AssessmentType
from app.models.grade_result import GradeResult
from app.models.activity import SystemActivity, ActivityPriority, ActivityAction, SessionTelemetry
from app.models.academic_record import AcademicRecord
from app.models.term_config import TermConfig
from app.models.pre_verified import PreVerifiedStudent
from app.models.verification import VerificationToken, TokenType
from app.models.system_config import SystemConfig

__all__ = [
    "User", "UserRole",
    "PreVerifiedStudent",
    "VerificationToken", "TokenType",
    "Student",
    "Instructor",
    "Doctor",
    "Faculty",
    "Department",
    "Course",
    "Enrollment",
    "Grade", "GradeType",
    "Session",
    "Attendance",
    "Device",
    "doctor_faculties", "doctor_departments",
    "instructor_faculties", "instructor_departments",
    "Assessment", "AssessmentType",
    "GradeResult",
    "AcademicRecord",
    "SystemActivity", "ActivityPriority", "ActivityAction",
    "SystemConfig"
]
