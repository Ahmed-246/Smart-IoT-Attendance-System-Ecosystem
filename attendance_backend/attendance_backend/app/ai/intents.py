# Common social intents for all roles
SOCIAL_INTENTS = {
    "greeting": {
        "keywords": ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy", "morning", "afternoon", "evening"],
        "synonyms": {"hlo": "hello", "hiii": "hi"},
        "confirm_phrase": "general greeting",
        "follow_ups": ["Check system status?", "View attendance report?"],
    },
    "well_being": {
        "keywords": ["how are you", "how's it going", "are you okay", "you good", "how do you feel", "whats up"],
        "synonyms": {"hru": "how are you"},
        "confirm_phrase": "well-being inquiry",
        "follow_ups": ["View system statistics?", "Check device fleet health?"],
    },
    "identity": {
        "keywords": ["who are you", "what are you", "your name", "who am i", "my role", "my name"],
        "synonyms": {"who r u": "who are you"},
        "confirm_phrase": "identity and role information",
        "follow_ups": ["Show my capabilities?", "Show my profile summary?"],
    },
    "help": {
        "keywords": ["help", "what can you do", "capabilities", "features", "options", "guide", "manual", "system navigation help"],
        "synonyms": {"hlp": "help", "guide": "help"},
        "confirm_phrase": "system capabilities and navigation guide",
        "follow_ups": ["List available commands?", "Show most popular topics?"],
    }
}

SOVEREIGN_INTENTS = {
    "system_status": {
        "keywords": ["system", "status", "health", "uptime", "lockdown", "emergency", "lock", "unlock", "online", "active"],
        "synonyms": {"systm": "system", "hlt": "health"},
        "confirm_phrase": "system health and lockdown status",
        "follow_ups": ["Would you like to toggle the emergency lock?", "Show me the active user sessions?"],
    },
    "session_monitoring": {
        "keywords": ["sessions", "active sessions", "who is online", "current users", "active users", "online users"],
        "synonyms": {"sesions": "sessions", "sesion": "session", "user sessions": "sessions"},
        "confirm_phrase": "active user sessions and online status",
        "follow_ups": ["Should I show the most active user?", "Want to see session durations?"],
    },
    "audit_logs": {
        "keywords": ["audit", "log", "trail", "activity", "track", "history"],
        "synonyms": {"audt": "audit", "logs": "log"},
        "confirm_phrase": "recent audit logs",
        "follow_ups": ["Should I filter by critical priority?", "Want to see recent logins?"],
    },
    "user_management": {
        "keywords": ["users", "admins", "count", "super", "roles", "capabilities", "grant"],
        "synonyms": {"usr": "users", "admin": "admins", "role": "roles"},
        "confirm_phrase": "user and capability management",
        "follow_ups": ["Want to see the capability matrix?", "Should I list all super admins?"],
    },
    "device_fleet": {
        "keywords": ["device", "fleet", "iot", "sensor", "scanner", "online", "offline"],
        "synonyms": {"devices": "device", "sensr": "sensor"},
        "confirm_phrase": "IoT device fleet status",
        "follow_ups": ["Want to see which devices are offline?", "Should I restart the scanners?"],
    },
    "general_stats": {
        "keywords": ["stats", "statistics", "overview", "total", "summary", "dashboard", "summary of your dashboard"],
        "synonyms": {"stat": "stats"},
        "confirm_phrase": "overall system statistics and dashboard summary",
        "follow_ups": ["Want to break this down by faculty?", "Should I show trend data?"],
    },
    **SOCIAL_INTENTS
}

OPERATIONS_INTENTS = {
    "student_approvals": {
        "keywords": ["approve", "pending", "registration", "allowlist", "waitlist", "new"],
        "synonyms": {"aprove": "approve", "pendng": "pending"},
        "confirm_phrase": "pending student registrations",
        "follow_ups": ["Would you like to auto-approve matches?", "Should I show the rejection list?"],
    },
    "attendance_overview": {
        "keywords": ["attendance", "rate", "percentage", "present", "absent", "report", "summary of your dashboard"],
        "synonyms": {"attendnce": "attendance", "absnt": "absent"},
        "confirm_phrase": "global attendance overview and dashboard summary",
        "follow_ups": ["Want to see the lowest attending courses?", "Should I export a report?"],
    },
    "course_enrollment": {
        "keywords": ["courses", "enroll", "enrollment", "pipeline", "capacity", "students"],
        "synonyms": {"enrol": "enroll"},
        "confirm_phrase": "course enrollment statistics",
        "follow_ups": ["Want to see the most popular course?", "Should I list empty courses?"],
    },
    "device_status": {
        "keywords": ["device", "scanner", "health", "battery", "status"],
        "synonyms": {"devices": "device"},
        "confirm_phrase": "IoT device status",
        "follow_ups": ["Want to ping the offline devices?"],
    },
    **SOCIAL_INTENTS
}

ACADEMIC_INTENTS = {
    "my_courses": {
        "keywords": ["course", "my", "classes", "schedule", "teach", "teaching", "assigned", "load"],
        "synonyms": {"courses": "course"},
        "confirm_phrase": "your assigned courses",
        "follow_ups": ["Want to see enrollment numbers for these?", "Should I show upcoming sessions?"],
    },
    "student_performance": {
        "keywords": ["grades", "gradebook", "performance", "score", "pass", "fail", "distribution", "results", "marks", "average"],
        "synonyms": {"grde": "grades", "scores": "score"},
        "confirm_phrase": "student grade performance",
        "follow_ups": ["Want to see students below 60%?", "Should I calculate the average?"],
    },
    "course_attendance": {
        "keywords": ["attendance", "present", "absent", "rate", "missing", "skip", "tracking", "records", "registry"],
        "synonyms": {"attendnce": "attendance"},
        "confirm_phrase": "attendance in your courses",
        "follow_ups": ["Want to see students with critical attendance?", "Should I send a warning email?"],
    },
    "assessments": {
        "keywords": ["assessment", "exam", "quiz", "weight", "midterm", "final", "test", "assignment", "project"],
        "synonyms": {"assesment": "assessment", "exams": "exam"},
        "confirm_phrase": "your course assessments",
        "follow_ups": ["Want to add a new quiz?", "Should I show unpublished grades?"],
    },
    **SOCIAL_INTENTS
}

TECHNICAL_INTENTS = {
    "session_management": {
        "keywords": ["session", "active", "lab", "start", "stop", "schedule", "upcoming", "running", "current"],
        "synonyms": {"sesion": "session", "labs": "lab"},
        "confirm_phrase": "lab session management",
        "follow_ups": ["Want to start a new session now?", "Should I show completed sessions?"],
    },
    "lab_attendance": {
        "keywords": ["attendance", "present", "scan", "rfid", "swipe", "rate", "tracking", "entry", "exit"],
        "synonyms": {"attendnce": "attendance"},
        "confirm_phrase": "attendance for your lab sessions",
        "follow_ups": ["Want to see the raw RFID logs?", "Should I manual override a student?"],
    },
    "device_troubleshooting": {
        "keywords": ["device", "reader", "scanner", "iot", "broken", "offline", "ping", "restart", "reboot", "diagnostic"],
        "synonyms": {"devices": "device"},
        "confirm_phrase": "device troubleshooting",
        "follow_ups": ["Want to restart the assigned scanner?"],
    },
    **SOCIAL_INTENTS
}

STUDENT_INTENTS = {
    "my_attendance": {
        "keywords": ["attendance", "present", "absent", "rate", "percentage", "skip", "miss", "records", "history", "tracking"],
        "synonyms": {"attendnce": "attendance", "precent": "present", "absnt": "absent"},
        "confirm_phrase": "your personal attendance records",
        "follow_ups": ["Would you like to see a breakdown by course?", "Should I show which sessions you missed?"],
    },
    "my_grades": {
        "keywords": ["grade", "score", "mark", "gpa", "pass", "fail", "result", "exam", "performance", "average"],
        "synonyms": {"grades": "grade", "scores": "score"},
        "confirm_phrase": "your academic grades",
        "follow_ups": ["Want study tips for your weakest course?", "Should I show unpublished marks?"],
    },
    "my_courses": {
        "keywords": ["course", "enroll", "schedule", "class", "subject", "classes", "lessons", "timetable", "list"],
        "synonyms": {"courses": "course", "classes": "class"},
        "confirm_phrase": "your current course schedule",
        "follow_ups": ["Want to see your total credit hours?", "Should I list your instructors?"],
    },
    "status_and_tips": {
        "keywords": ["status", "academic", "standing", "warning", "tip", "improve", "help", "summary of your dashboard"],
        "synonyms": {"tips": "tip", "stat": "status"},
        "confirm_phrase": "your academic status and dashboard summary",
        "follow_ups": ["Want to set an attendance goal?", "Should I show the university guidelines?"],
}}
