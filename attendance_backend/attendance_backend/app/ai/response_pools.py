import random
from datetime import datetime

def get_time_greeting() -> str:
    hour = datetime.now().hour
    if hour < 12: return "Good morning"
    if hour < 17: return "Good afternoon"
    return "Good evening"

def get_commentary(metric: str, value: float) -> str:
    """Returns contextual remark based on threshold."""
    if metric == "attendance_rate":
        if value >= 90: return "🌟 Outstanding! You're in the top tier."
        if value >= 75: return "✅ Above minimum — keep it steady!"
        if value >= 60: return "⚠️ Getting close to the danger zone. Try not to miss more sessions."
        return "🚨 Critical! You're below the minimum threshold. This needs immediate attention."
    
    if metric == "system_health":
        if value == 100: return "✅ All systems nominal. Smooth sailing."
        if value >= 80: return "⚠️ Some minor issues, but generally stable."
        return "🚨 Critical alerts active. Please check the logs immediately."
        
    return ""

def pick_response(pool: list[str], **data) -> str:
    """Randomly selects a template and fills in the provided data."""
    template = random.choice(pool)
    # Add time greeting to data if not provided
    if "time_greeting" not in data:
        data["time_greeting"] = get_time_greeting()
    
    # Safe format to ignore missing keys
    class SafeDict(dict):
        def __missing__(self, key):
            return "{" + key + "}"
            
    return template.format_map(SafeDict(**data))

# --- Pools ---

STUDENT_ATTENDANCE_POOL = [
    "📈 {name}, your attendance rate is **{rate}%** ({present}/{total} sessions). {commentary}",
    "📊 Here's your attendance snapshot, {name}:\n• Overall: **{rate}%**\n• Present: {present}\n• Absent: {absent}\n{commentary}",
    "✅ {name}, your attendance sits at **{rate}%**. {trend_text} {commentary}",
    "{time_greeting} {name}! Your attendance is **{rate}%** — {commentary}",
]

STUDENT_GRADES_POOL = [
    "🎓 Your current overall GPA is **{gpa}**. {commentary}",
    "📊 Let's look at your grades, {name}. Your average is **{gpa}**. {trend_text}",
    "{time_greeting}! You're currently standing at a **{gpa}** GPA. {commentary}",
]

SOVEREIGN_SYSTEM_POOL = [
    "🖥️ System Overview: **{health}%** health. There are **{active_users}** active sessions. {commentary}",
    "{time_greeting} Sovereign. System health is **{health}%**. {trend_text}",
    "🛡️ All secure. The system is operating at **{health}%** capacity with {active_users} users online. {commentary}",
]

OPERATIONS_APPROVAL_POOL = [
    "📋 There are currently **{pending_count}** students awaiting approval. {trend_text}",
    "{time_greeting}, we have **{pending_count}** pending registrations in the queue.",
    "⚠️ Action needed: **{pending_count}** accounts require verification.",
]

OPERATIONS_ATTENDANCE_POOL = [
    "📊 Global attendance overview: The current system-wide rate is **{global_rate}%** across all faculties.",
    "📈 Statistics show a **{global_rate}%** attendance rate today. System throughput is stable.",
    "{time_greeting}! Overall attendance is at **{global_rate}%**. Should I break this down by department?",
]

OPERATIONS_ENROLLMENT_POOL = [
    "🎓 There are **{total_students}** students enrolled across **{course_count}** active courses.",
    "📚 Enrollment Snapshot: {total_students} total students. The most popular course is **{popular_course}**.",
    "✅ System wide, we have {total_students} active enrollments. There are {empty_courses_count} courses with zero students.",
]

OPERATIONS_DEVICE_POOL = [
    "📡 Device Fleet: **{offline_devices}** scanners are currently offline. {device_status}",
    "⚠️ Alert: {offline_devices} devices need attention. Most are located in the Engineering block.",
    "✅ All scanners are healthy, except for {offline_devices} offline units. Battery levels are nominal.",
]

ACADEMIC_COURSE_POOL = [
    "📚 You are teaching **{course_count}** courses this semester, with a total of **{student_count}** students.",
    "{time_greeting} Doctor! Your {course_count} courses are running smoothly. Total enrollment: {student_count}.",
    "🎓 Your academic summary: {course_count} active courses. {trend_text}",
]

ACADEMIC_PERFORMANCE_POOL = [
    "📈 Average performance in your courses is **{avg_performance}**. There are **{critical_students}** students currently failing.",
    "📊 Grade distribution: Most students are in the B+ range. {critical_students} students have critical attendance issues.",
    "💯 Performance overview: Average score is {avg_performance}. Would you like to see the list of students at risk?",
]

TECHNICAL_SESSION_POOL = [
    "🔧 You have **{session_count}** sessions scheduled today. {commentary}",
    "{time_greeting} Engineer! There are {session_count} active lab sessions. Equipment status: {device_status}.",
    "⚡ Technical status: {session_count} sessions running. {device_status}",
]

TECHNICAL_TROUBLE_POOL = [
    "🛠️ Diagnostic result: {device_status}. Average scanner battery is at **{scanner_battery}**.",
    "📡 Troubleshooting report: {active_labs} labs are currently utilizing RFID scanners. No interference detected.",
    "✅ All systems nominal. Battery levels average {scanner_battery}. No hardware failures reported in the last 24h.",
]

STUDENT_COURSE_POOL = [
    "📚 You are currently enrolled in: **{courses_list}**. Your next class is **{next_class}**.",
    "🗓️ Your schedule: {courses_list}. Don't forget your next session: {next_class}.",
    "✅ You have {total} total sessions across your courses. Next up: {next_class}.",
]

GREETING_POOL = [
    "👋 {time_greeting}! I'm ARIA, how can I help you today?",
    "Hello! It's great to see you. What's on your mind?",
    "Hi there! Ready to dive into some data, or just checking in?",
    "{time_greeting}! I'm active and ready to assist. What can I do for you?",
]

WELL_BEING_POOL = [
    "😊 I'm functioning at 100% capacity and ready to help! How about you?",
    "I'm doing great! My neural circuits are humming along nicely. How can I assist?",
    "All systems nominal! I'm here and eager to process your requests. How are things on your end?",
]

IDENTITY_POOL = [
    "🤖 I am ARIA (Academic & Research Intelligence Assistant), your dedicated AI for this IoT Attendance System.",
    "I'm ARIA! I've been designed to help you navigate the system and understand your data in real-time.",
    "You're speaking with ARIA. I live inside this server and have access to the live attendance database.",
]

HELP_POOL = [
    "📚 I can help you with a variety of tasks! Depending on your role, you can ask about attendance, grades, system health, or device status.",
    "I'm trained to analyze system metrics, track student progress, and help with navigation. Try asking 'What can you do?' for more details.",
    "Need a hand? I can pull up reports, check active sessions, or show you your academic standing. Just ask!",
]

GENERIC_UNKNOWN_POOL = [
    "I'm not quite sure I understand. Could you rephrase?",
    "{time_greeting}, I couldn't process that request. Try asking something else.",
    "Hmm, that doesn't match my database parameters. Can you clarify?",
    "I'm still learning! Could you try asking that in a different way? Maybe about attendance or grades?",
]
