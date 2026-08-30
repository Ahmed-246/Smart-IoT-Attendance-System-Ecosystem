# Static knowledge base for the 5 roles

SOVEREIGN_KNOWLEDGE = {
    "navigation": {
        "lock_system": "Navigate to System Config → Emergency Lock toggle",
        "grant_capability": "Go to Admin Center → Admins Directory → Set permission for the user by + Grant Override button",
        "view_audit_logs": "Go to System Monitoring → Audit Timeline",
    },
    "policies": {
        "system_lockdown": "Emergency lock prevents all user logins except super admins. Use only during active threats.",
        "data_purge": "Data purge permanently deletes logs older than 90 days. Requires SYSTEM_DATA_PURGE capability.",
    }
}

OPERATIONS_KNOWLEDGE = {
    "navigation": {
        "approve_student": "Go to Students → Pending Approvals → Click Approve",
        "add_course": "Go to Academic Setup → Courses → Add New",
        "view_reports": "Go to Reports → Select Date Range → Export CSV",
    },
    "policies": {
        "enrollment_cap": "Default course capacity is 50. Can be overridden in Course Settings.",
        "auto_approve": "Students matching allowlist records are auto-approved instantly.",
    }
}

ACADEMIC_KNOWLEDGE = {
    "navigation": {
        "view_grades": "Go to My Courses → Select Course → Gradebook",
        "add_assessment": "Go to My Courses → Select Course → Assessments → Add New",
    },
    "policies": {
        "attendance_threshold": "Minimum attendance rate is 75% per course to be eligible for finals.",
        "grading_scale": "Passing score is 60%. Scale: A(90+), B(80-89), C(70-79), D(60-69), F(<60)",
    }
}

TECHNICAL_KNOWLEDGE = {
    "navigation": {
        "start_session": "Go to Lab Management → Upcoming Sessions → Start",
        "check_device": "Go to Devices → Select Scanner → View Health",
    },
    "policies": {
        "rfid_timeout": "Scanner will timeout after 15 minutes of inactivity.",
        "manual_override": "Instructors can manually override attendance if a student's card fails to read.",
    }
}

STUDENT_KNOWLEDGE = {
    "navigation": {
        "view_attendance": "Go to Dashboard → Attendance Widget → View Details",
        "view_grades": "Go to Academic Records → Transcripts",
    },
    "policies": {
        "attendance_policy": "You must attend at least 75% of your sessions. Falling below this may result in academic warning.",
        "academic_standing": "Your GPA must remain above 2.0. If it falls below, you will be placed on probation.",
    }
}
