package com.attendance.app.ui

sealed class Screen(val route: String) {
    object Splash     : Screen("splash")
    object Intro      : Screen("intro")
    object Login      : Screen("login")
    object Dashboard  : Screen("dashboard")
    
    // Personal Attendance History (for Students)
    object Attendance : Screen("attendance/{studentId}") {
        fun go(id: Int) = "attendance/$id"
    }
    
    // Session Report (for Admins - list of present/absent)
    object SessionReport : Screen("session_report/{sessionId}") {
        fun go(id: Int) = "session_report/$id"
    }

    object Sessions   : Screen("sessions")
    object Chatbot    : Screen("chatbot")
    object Profile    : Screen("profile")
    object Assessments: Screen("assessments")
    object Gradebook  : Screen("gradebook/{assessmentId}") {
        fun go(id: Int) = "gradebook/$id"
    }
    
    // New Management Actions
    object Approvals  : Screen("approvals")
    object IoT        : Screen("iot_workshop")
    object MobileScanner : Screen("mobile_scanner")
    object Register   : Screen("register")
    object ForgotPassword : Screen("forgot_password")
    object AppSettings    : Screen("app_settings")
    object Hierarchy  : Screen("hierarchy")
    object CreateSession : Screen("create_session")
    object CourseManagement : Screen("course_management")
    object ManagementHub : Screen("management_hub")
    object UserManagement : Screen("user_management")
    object HierarchyManagement : Screen("hierarchy_management")
    object Performance : Screen("performance")

    // Phase 2 User Management Screens
    object Students : Screen("students")
    object StudentProfile : Screen("student_profile/{studentId}") {
        fun go(id: Int) = "student_profile/$id"
    }
    object Doctors : Screen("doctors")
    object DoctorProfile : Screen("doctor_profile/{doctorId}") {
        fun go(id: Int) = "doctor_profile/$id"
    }
    object Admins : Screen("admins")
}
