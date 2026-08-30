package com.attendance.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
import okhttp3.MultipartBody
import javax.inject.Inject

data class DashboardUiState(
    val role: String = "",
    val email: String = "",
    val name: String = "",
    val userId: Int = 0,
    val studentId: Int? = null,
    val activeSessions: List<Session> = emptyList(),
    val students: List<Student> = emptyList(),
    val courses: List<Course> = emptyList(),
    val globalStats: GlobalStats? = null,
    val activityFeed: List<ActivityFeedItem> = emptyList(),
    val studentAttendance: List<AttendanceRecord> = emptyList(),
    val studentGrades: StudentGradeSummary? = null,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val successMsg: String? = null,
    val termConfig: TermConfig? = null,
    val monitoringSummary: MonitoringSummary? = null,
    val profileImage: String? = null,
    val monitoringLogs: List<LogEntry> = emptyList(),
    val attendanceTrend: List<Float> = emptyList(),
    val gradeTrend: List<Float> = emptyList()
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardUiState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                repo.getRoleFlow().onStart { emit("student") }, 
                repo.getEmailFlow().onStart { emit("") }, 
                repo.getNameFlow().onStart { emit("") },
                repo.getUserIdFlow().onStart { emit(0) },
                repo.getStudentIdFlow().onStart { emit(null as Int?) },
                repo.getProfileImageUrlFlow().onStart { emit(null as String?) },
                repo.getBaseUrlFlow().onStart { emit("") }
            ) { flows: Array<Any?> ->
                DataPack(
                    role = flows[0] as? String ?: "student",
                    email = flows[1] as? String ?: "",
                    name = flows[2] as? String ?: "",
                    uid = flows[3] as? Int ?: 0,
                    studentId = flows[4] as? Int,
                    img = flows[5] as? String,
                    url = flows[6] as? String ?: ""
                )
            }.distinctUntilChanged { old, new -> 
                old.role == new.role && old.uid == new.uid && old.name == new.name && old.url == new.url
            }.collect { pack ->
                val prevRole = _state.value.role
                _state.update { it.copy(
                    role = pack.role, 
                    email = pack.email, 
                    name = pack.name,
                    userId = pack.uid,
                    studentId = pack.studentId,
                    profileImage = pack.img
                ) }
                // Only trigger full load if it's the first time or role changed
                if (prevRole.isEmpty() || prevRole != pack.role) {
                    loadData(isInitial = true)
                } else {
                    loadData(isInitial = false) // Just a refresh
                }
            }
        }
    }

    private data class DataPack(val role: String, val email: String, val name: String, val uid: Int, val studentId: Int?, val img: String?, val url: String)

    fun refreshMonitoring() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true) }
            when (val r = repo.getMonitoringSummary()) {
                is Result.Success -> _state.update { it.copy(monitoringSummary = r.data) }
                else -> {}
            }
            _state.update { it.copy(isRefreshing = false) }
        }
    }

    fun fetchLogs() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true) }
            when (val r = repo.getMonitoringLogs()) {
                is Result.Success<*> -> {
                    val data = r.data as? List<LogEntry> ?: emptyList()
                    _state.update { it.copy(monitoringLogs = data) }
                }
                is Result.Error -> _state.update { it.copy(error = r.message) }
                else -> {}
            }
            _state.update { it.copy(isRefreshing = false) }
        }
    }

    fun loadData(isInitial: Boolean = false) {
        if (_state.value.isLoading || _state.value.isRefreshing) return
        
        viewModelScope.launch {
            if (isInitial) _state.update { it.copy(isLoading = true, error = null) }
            else _state.update { it.copy(isRefreshing = true) }
            
            val currentRole = _state.value.role.lowercase()
            val userId = _state.value.userId

            // 1. Fetch common data safely
            val sessionsResult = try {
                if (currentRole == "student") repo.getMySessions()
                else repo.getActiveSessions()
            } catch (e: Exception) {
                Result.Error("Failed to load sessions: ${e.localizedMessage}")
            }

            val coursesResult = try {
                repo.getCourses()
            } catch (e: Exception) {
                Result.Error("Failed to load courses: ${e.localizedMessage}")
            }

            val activeSessions = (sessionsResult as? Result.Success)?.data ?: emptyList()
            val courses = (coursesResult as? Result.Success)?.data ?: emptyList()
            val commonError = if (sessionsResult is Result.Error) sessionsResult.message 
                             else if (coursesResult is Result.Error) coursesResult.message 
                             else null

            _state.update { it.copy(
                activeSessions = activeSessions,
                courses = courses,
                error = commonError
            ) }

            // 2. Fetch role-specific data safely
            if (currentRole in listOf("super_admin", "admin", "doctor", "engineer")) {
                try {
                    when (val studentsResult = repo.getStudents()) {
                        is Result.Success -> _state.update { it.copy(students = studentsResult.data) }
                        else -> {}
                    }
                } catch (e: Exception) {
                    // Non-blocking
                }
            }

            // 3. Fetch Admin Data safely if applicable
            if (currentRole in listOf("super_admin", "admin")) {
                try {
                    val stats = repo.getGlobalStats()
                    val feed = repo.getActivityFeed()
                    val config = repo.getTermConfig()
                    val mon = repo.getMonitoringSummary()

                    _state.update { it.copy(
                        globalStats = (stats as? Result.Success)?.data,
                        activityFeed = (feed as? Result.Success)?.data ?: emptyList(),
                        termConfig = (config as? Result.Success)?.data,
                        monitoringSummary = (mon as? Result.Success)?.data
                    ) }
                } catch (e: Exception) {
                    // Non-blocking
                }
            }

            // 4. Fetch Student Data safely if applicable
            if (currentRole == "student") {
                val targetId = _state.value.studentId ?: userId
                val attendanceList = try {
                    when (val attendance = repo.getStudentAttendance(targetId)) {
                        is Result.Success -> attendance.data
                        else -> emptyList()
                    }
                } catch (e: Exception) {
                    emptyList()
                }

                val gradeSummary = try {
                    when (val grades = repo.getGradeReport(targetId)) {
                        is Result.Success -> grades.data.students.firstOrNull()
                        else -> null
                    }
                } catch (e: Exception) {
                    null
                }

                // Calculate trends safely
                val attTrend = if (attendanceList.isNotEmpty()) {
                    attendanceList.reversed().take(10).mapIndexed { index, _ ->
                        val subList = attendanceList.reversed().take(index + 1)
                        val present = subList.count { it.status.lowercase() in listOf("present", "late") }
                        (present.toFloat() / subList.size.toFloat()) * 100f
                    }
                } else {
                    emptyList()
                }

                val grTrend = gradeSummary?.courseResults?.map { it.finalScore.toFloat() }?.takeIf { it.size >= 2 } 
                    ?: listOf(75f, 82f, 78f, 85f, 90f)

                _state.update { it.copy(
                    studentAttendance = attendanceList,
                    studentGrades = gradeSummary,
                    attendanceTrend = attTrend,
                    gradeTrend = grTrend
                ) }
            }

            _state.update { it.copy(isLoading = false, isRefreshing = false) }
        }
    }

    fun createSession(courseId: Int) {
        viewModelScope.launch {
            when (val r = repo.createSession(courseId)) {
                is Result.Success -> {
                    _state.update { it.copy(successMsg = "Session started successfully!") }
                    loadData()
                }
                is Result.Error -> _state.update { it.copy(error = r.message) }
                else -> {}
            }
        }
    }

    fun closeSession(sessionId: Int) {
        viewModelScope.launch {
            when (val r = repo.closeSession(sessionId)) {
                is Result.Success -> {
                    _state.update { it.copy(successMsg = "Session closed.") }
                    loadData()
                }
                is Result.Error -> _state.update { it.copy(error = r.message) }
                else -> {}
            }
        }
    }

    fun uploadSystemLogo(logo: MultipartBody.Part) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val r = repo.uploadSystemLogo(logo)) {
                is Result.Success -> {
                    _state.update { it.copy(successMsg = "System logo updated successfully!") }
                    loadData()
                }
                is Result.Error -> _state.update { it.copy(error = r.message) }
                else -> {}
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun clearMessages() = _state.update { it.copy(error = null, successMsg = null) }
}
