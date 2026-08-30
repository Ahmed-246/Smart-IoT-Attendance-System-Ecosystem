package com.attendance.app.model
// Last synced by Antigravity at 2026-05-07T10:38:00


import com.google.gson.annotations.SerializedName

// ─── Auth ─────────────────────────────────────────────────────

data class LoginRequest(
    val email: String,
    val password: String
)

data class PasswordResetRequest(
    @SerializedName("phone_number") val phoneNumber: String
)

data class PasswordResetConfirm(
    @SerializedName("phone_number") val phoneNumber: String,
    val token: String,
    @SerializedName("new_password") val newPassword: String
)

data class TokenResponse(
    @SerializedName("access_token") val accessToken: String,
    val role: String,
    @SerializedName("user_id") val userId: Int,
    @SerializedName("student_id") val studentId: Int?,
    @SerializedName("instructor_id") val instructorId: Int?,
    @SerializedName("doctor_id") val doctorId: Int?,
    val name: String?,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    @SerializedName("assigned_department_ids") val assignedDepartments: List<Int>?,
    @SerializedName("assigned_faculty_ids") val assignedFaculties: List<Int>?
)

data class TermConfig(
    val id: Int,
    @SerializedName("term_name") val termName: String,
    @SerializedName("exam_weight") val examWeight: Double,
    @SerializedName("coursework_weight") val courseworkWeight: Double,
    @SerializedName("system_logo_url") val systemLogoUrl: String?
)

data class UserOut(
    val id: Int,
    val name: String?,
    val email: String,
    val role: String,
    @SerializedName("phone_number") val phoneNumber: String?,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    @SerializedName("last_login") val lastLogin: String?
)

data class UserCreate(
    val name: String?,
    val email: String,
    val password: String,
    @SerializedName("academic_password") val academicPassword: String? = null,
    val role: String,
    @SerializedName("phone_number") val phoneNumber: String? = null
)

data class UserUpdate(
    val name: String? = null,
    val email: String? = null,
    val password: String? = null,
    @SerializedName("academic_password") val academicPassword: String? = null,
    val role: String? = null,
    @SerializedName("phone_number") val phoneNumber: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null
)

// ─── Academic Structure ───────────────────────────────────────

data class Faculty(
    val id: Int,
    val name: String,
    val description: String?,
    @SerializedName("total_years") val totalYears: Int?
)

data class FacultyCreate(
    val name: String,
    val description: String? = null,
    @SerializedName("total_years") val totalYears: Int = 4
)

data class FacultyUpdate(
    val name: String? = null,
    val description: String? = null,
    @SerializedName("total_years") val totalYears: Int? = null
)

data class Department(
    val id: Int,
    @SerializedName("faculty_id") val facultyId: Int,
    val name: String,
    val description: String?
)

data class DepartmentCreate(
    val name: String,
    val description: String? = null,
    @SerializedName("faculty_id") val facultyId: Int
)

data class DepartmentUpdate(
    val name: String? = null,
    val description: String? = null,
    @SerializedName("faculty_id") val facultyId: Int? = null
)

// ─── Course ───────────────────────────────────────────────────

data class Course(
    val id: Int,
    val name: String,
    @SerializedName("course_code") val courseCode: String?,
    @SerializedName("department_id") val departmentId: Int,
    @SerializedName("instructor_id") val instructorId: Int?,
    @SerializedName("doctor_id") val doctorId: Int?,
    val semester: Int?,
    @SerializedName("academic_year") val academicYear: Int?,
    val credits: Double?,
    @SerializedName("is_elective") val isElective: Boolean?
)

data class CourseCreate(
    val name: String,
    @SerializedName("course_code") val courseCode: String? = null,
    @SerializedName("department_id") val departmentId: Int = 1,
    @SerializedName("instructor_id") val instructorId: Int? = null,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    val semester: Int = 1,
    @SerializedName("academic_year") val academicYear: Int = 1,
    val credits: Double = 3.0,
    @SerializedName("is_elective") val isElective: Boolean = false
)

data class CourseUpdate(
    val name: String? = null,
    @SerializedName("course_code") val courseCode: String? = null,
    @SerializedName("department_id") val departmentId: Int? = null,
    @SerializedName("instructor_id") val instructorId: Int? = null,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    val semester: Int? = null,
    @SerializedName("academic_year") val academicYear: Int? = null,
    val credits: Double? = null,
    @SerializedName("is_elective") val isElective: Boolean? = null
)

// ─── Student ──────────────────────────────────────────────────

data class Student(
    val id: Int,
    val name: String,
    val email: String,
    @SerializedName("rfid_uid") val rfidUid: String,
    @SerializedName("university_id") val universityId: String?,
    @SerializedName("department_id") val departmentId: Int?,
    @SerializedName("academic_year") val academicYear: Int?,
    @SerializedName("current_semester") val currentSemester: Int?,
    @SerializedName("academic_status") val academicStatus: String?,
    @SerializedName("is_blacklisted") val isBlacklisted: Boolean?
)

data class StudentUpdate(
    val name: String? = null,
    val email: String? = null,
    @SerializedName("rfid_uid") val rfidUid: String? = null,
    @SerializedName("university_id") val universityId: String? = null,
    @SerializedName("department_id") val departmentId: Int? = null,
    @SerializedName("academic_year") val academicYear: Int? = null,
    @SerializedName("current_semester") val currentSemester: Int? = null,
    @SerializedName("academic_status") val academicStatus: String? = null
)

data class StudentProfileOut(
    val student: Student,
    @SerializedName("attendance_percentage") val attendancePercentage: Double,
    @SerializedName("total_sessions") val totalSessions: Int,
    @SerializedName("attended_sessions") val attendedSessions: Int,
    @SerializedName("faculty_name") val facultyName: String?,
    @SerializedName("department_name") val departmentName: String?,
    @SerializedName("enrolled_courses") val enrolledCourses: List<Course>,
    @SerializedName("committed_grades") val committedGrades: List<GradeResult>,
    @SerializedName("attendance_history") val attendanceHistory: List<AttendanceRecord>
)

// ─── Attendance ───────────────────────────────────────────────

data class AttendanceRecord(
    val id: Int,
    @SerializedName("student_id") val studentId: Int,
    @SerializedName("session_id") val sessionId: Int,
    @SerializedName("instructor_id") val instructorId: Int?,
    val timestamp: String,
    val status: String
)

data class AttendanceRecordWithDetails(
    @SerializedName("student_id") val studentId: Int,
    @SerializedName("student_name") val studentName: String,
    @SerializedName("university_id") val universityId: String?,
    @SerializedName("department_name") val departmentName: String?,
    val timestamp: String?,
    val status: String
)

data class AttendanceReport(
    @SerializedName("session_id") val sessionId: Int,
    @SerializedName("course_name") val courseName: String,
    @SerializedName("total_students") val totalStudents: Int,
    val present: Int,
    val absent: Int,
    @SerializedName("attendance_rate") val attendanceRate: Double,
    val records: List<AttendanceRecordWithDetails>
)

// ─── Session ──────────────────────────────────────────────────

data class ScanRequest(
    val rfid_uid: String,
    val device_id: String
)

data class ScanResponse(
    val message: String
)

data class Session(
    val id: Int,
    @SerializedName("course_id") val courseId: Int,
    @SerializedName("instructor_id") val instructorId: Int?,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String?,
    @SerializedName("is_active") val isActive: Boolean,
    @SerializedName("doctor_id") val doctorId: Int?
)

data class SessionCreate(
    @SerializedName("course_id") val courseId: Int,
    @SerializedName("instructor_id") val instructorId: Int? = null,
    @SerializedName("doctor_id") val doctorId: Int? = null
)

// ─── Assessments & Grading ────────────────────────────────────

data class Assessment(
    val id: Int,
    @SerializedName("course_id") val courseId: Int?,
    @SerializedName("course_code") val courseCode: Int?,
    val title: String?,
    val type: String?,
    @SerializedName("assessment_type") val assessmentType: String?,
    @SerializedName("max_score") val maxScore: Double?,
    @SerializedName("weight_pct") val weightPct: Double?,
    val status: String?,
    @SerializedName("created_by") val createdBy: Int?
)

data class AssessmentCreate(
    @SerializedName("course_code") val courseCode: Int,
    val title: String,
    @SerializedName("assessment_type") val assessmentType: String,
    @SerializedName("max_score") val maxScore: Double,
    @SerializedName("instructor_id") val instructorId: Int? = null
)

data class GradeResult(
    val id: Int,
    @SerializedName("assessment_id") val assessmentId: Int,
    @SerializedName("student_id") val studentId: Int,
    @SerializedName("raw_score") val rawScore: Double,
    @SerializedName("instructor_remarks") val instructorRemarks: String?,
    @SerializedName("is_flagged") val isFlagged: Boolean,
    @SerializedName("is_absent") val isAbsent: Boolean,
    @SerializedName("student_name") val studentName: String?,
    @SerializedName("university_id") val universityId: String?
)

data class BulkGradeUpdate(
    @SerializedName("student_id") val studentId: Int,
    @SerializedName("raw_score") val rawScore: Double,
    @SerializedName("instructor_remarks") val instructorRemarks: String?,
    @SerializedName("is_flagged") val isFlagged: Boolean,
    @SerializedName("is_absent") val isAbsent: Boolean
)

data class GradeBulkCommit(
    val grades: List<BulkGradeUpdate>,
    @SerializedName("instructor_id") val instructorId: Int?,
    val finalize: Boolean
)

// ─── AI ───────────────────────────────────────────────────────

data class AIQuery(
    val question: String,
    @SerializedName("message_count") val messageCount: Int = 0
)

data class AIResponse(
    val answer: String,
    val intent: String? = null,
    val confidence: Double? = null,
    val persona: String? = null,
    @SerializedName("remaining_messages") val remainingMessages: Int? = null,
    val data: Map<String, Any>? = null,
    @SerializedName("session_expired") val sessionExpired: Boolean = false,
    val suggestions: List<String>? = null
)

// ─── Command Center Telemetry ──────────────────────────

data class GlobalStats(
    @SerializedName("total_students") val totalStudents: Int,
    @SerializedName("student_trend") val studentTrend: Float,
    @SerializedName("active_scanners") val activeScanners: Int,
    @SerializedName("total_scanners") val totalScanners: Int,
    @SerializedName("uptime_pct") val uptimePct: Float,
    @SerializedName("alerts_count") val alertsCount: Int,
    @SerializedName("total_faculties") val totalFaculties: Int,
    @SerializedName("total_departments") val totalDepartments: Int,
    @SerializedName("total_courses") val totalCourses: Int
)

data class ActivityFeedItem(
    val id: String,
    val type: String,
    val title: String,
    val subtitle: String,
    val timestamp: String,
    @SerializedName("icon_type") val iconType: String
)

// ─── IoT Discovery ────────────────────────────────────────────

data class DiscoveryResult(
    val status: String,
    val uid: String?
)

// ─── Generic ──────────────────────────────────────────────────

data class ApiError(val detail: String)

// ─── Grade Report (Student) ───────────────────────────

data class SubjectGrade(
    @SerializedName("course_name") val courseName: String,
    @SerializedName("course_code") val courseCode: String?,
    @SerializedName("final_score") val finalScore: Double,
    @SerializedName("passing_score") val passingScore: Double,
    @SerializedName("is_passed") val isPassed: Boolean
)

data class StudentGradeSummary(
    @SerializedName("student_id") val studentId: Int,
    @SerializedName("university_id") val universityId: String,
    @SerializedName("student_name") val studentName: String,
    @SerializedName("academic_year") val academicYear: Int,
    @SerializedName("final_grade_percentage") val finalGradePercentage: Double,
    val status: String,
    @SerializedName("failed_subject_count") val failedSubjectCount: Int,
    @SerializedName("at_risk") val atRisk: Boolean,
    @SerializedName("total_courses") val totalCourses: Int,
    @SerializedName("course_results") val courseResults: List<SubjectGrade>
)

data class GradeReportResponse(
    val students: List<StudentGradeSummary>,
    val total: Int,
    @SerializedName("term_info") val termInfo: Map<String, Any>?
)

// ─── Monitoring ─────────────────────────────────────────────

data class MonitoringSummary(
    @SerializedName("total_logs") val totalLogs: Int,
    @SerializedName("critical_24h") val critical24h: Int,
    @SerializedName("warnings_24h") val warnings24h: Int,
    @SerializedName("active_sessions") val activeSessions: Int,
    @SerializedName("recent_alerts") val recentAlerts: List<LogEntry>?
)

data class LogEntry(
    val id: Int,
    @SerializedName("user_id") val userId: Int?,
    @SerializedName("user_name") val userName: String?,
    @SerializedName("user_role") val userRole: String?,
    @SerializedName("action_type") val actionType: String,
    val description: String,
    val priority: String,
    val timestamp: String,
    @SerializedName("target_model") val targetModel: String?,
    @SerializedName("target_id") val targetId: String?
)

// ─── Pre-Verification (Onboarding) ──────────────────────────

data class PreVerifiedStudentCreate(
    @SerializedName("university_id") val universityId: String,
    val name: String,
    @SerializedName("phone_number") val phoneNumber: String?,
    @SerializedName("faculty_id") val facultyId: Int?,
    @SerializedName("department_id") val departmentId: Int?,
    @SerializedName("academic_year") val academicYear: Int?
)

data class PreVerifiedStudentOut(
    val id: Int,
    @SerializedName("university_id") val universityId: String,
    val name: String,
    @SerializedName("phone_number") val phoneNumber: String?,
    @SerializedName("faculty_id") val facultyId: Int?,
    @SerializedName("department_id") val departmentId: Int?,
    @SerializedName("academic_year") val academicYear: Int?,
    @SerializedName("faculty_name") val facultyName: String? = null,
    @SerializedName("department_name") val departmentName: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class AutoApproveHistoryItem(
    val id: Int,
    val name: String,
    val email: String,
    @SerializedName("university_id") val universityId: String,
    @SerializedName("approved_at") val approvedAt: String,
    @SerializedName("admin_name") val adminName: String,
    @SerializedName("admin_seen_auto_approve") val adminSeen: Boolean
)

data class CapabilityOut(
    @SerializedName("capability_name") val capabilityName: String,
    @SerializedName("expires_at") val expiresAt: String?
)

data class DoctorOut(
    val id: Int,
    val name: String,
    val email: String,
    val title: String?,
    @SerializedName("phone_number") val phoneNumber: String?,
    val specialization: String?,
    @SerializedName("office_hours") val officeHours: String?,
    val bio: String?,
    @SerializedName("appointment_link") val appointmentLink: String?,
    val faculties: List<Faculty>?,
    val departments: List<Department>?,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    val capabilities: List<CapabilityOut>? = null
)

data class DoctorProfileOut(
    val doctor: DoctorOut,
    @SerializedName("assigned_courses") val assignedCourses: List<Course>
)

data class InstructorOut(
    val id: Int,
    val name: String,
    val email: String,
    val title: String?,
    @SerializedName("phone_number") val phoneNumber: String?,
    val specialization: String?,
    @SerializedName("office_hours") val officeHours: String?,
    val bio: String?,
    @SerializedName("appointment_link") val appointmentLink: String?,
    val faculties: List<Faculty>?,
    val departments: List<Department>?,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    val capabilities: List<CapabilityOut>? = null
)

data class InstructorProfileOut(
    val instructor: InstructorOut,
    @SerializedName("assigned_courses") val assignedCourses: List<Course>
)

