package com.attendance.app.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.Student
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

data class ProfileUiState(
    val email: String = "",
    val name: String = "",
    val profileImageUrl: String = "",
    val role: String = "",
    val userId: Int = 0,
    val universityId: String = "",
    val facultyName: String = "",
    val departmentName: String = "Loading...",
    val phoneNumber: String = "",
    val studentInfo: Student? = null,
    val doctorProfile: com.attendance.app.model.DoctorProfileOut? = null,
    val instructorProfile: com.attendance.app.model.InstructorProfileOut? = null,
    val attendanceRate: Double = 0.0,
    val totalSessions: Int = 0,
    val globalStats: com.attendance.app.model.GlobalStats? = null,
    val monitoringSummary: com.attendance.app.model.MonitoringSummary? = null,
    val isLoggedOut: Boolean = false,
    val isLoading: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                repo.getEmailFlow(), 
                repo.getRoleFlow(), 
                repo.getUserIdFlow(),
                repo.getNameFlow(),
                repo.getProfileImageUrlFlow()
            ) { email: String?, role: String?, uid: Int?, name: String?, img: String? ->
                DataPack(email ?: "", role ?: "", uid ?: 0, name ?: "", img ?: "")
            }.collect { (email, roleStr, uid, name, img) ->
                val role = roleStr.lowercase()
                _state.update { it.copy(
                    email = email, 
                    role = roleStr, 
                    userId = uid,
                    name = name,
                    profileImageUrl = img,
                    departmentName = when(role) {
                        "super_admin" -> "System Administration"
                        "admin" -> "Campus Administration"
                        "doctor", "engineer" -> "Staff Faculty"
                        else -> "Loading..."
                    }
                ) }
                
                if (role == "student") {
                    loadStudentDetails()
                } else {
                    loadStaffDetails()
                    loadTelemetry()
                }
            }
        }
    }

    private fun loadTelemetry() {
        val role = _state.value.role.lowercase()
        viewModelScope.launch {
            if (role in listOf("super_admin", "admin")) {
                when (val res = repo.getGlobalStats()) {
                    is Result.Success -> _state.update { it.copy(globalStats = res.data) }
                    else -> {}
                }
            }
            if (role in listOf("super_admin", "admin", "engineer")) {
                when (val res = repo.getMonitoringSummary()) {
                    is Result.Success -> _state.update { it.copy(monitoringSummary = res.data) }
                    else -> {}
                }
            }
        }
    }

    private data class DataPack(val email: String, val role: String, val uid: Int, val name: String, val img: String)

    private fun loadStaffDetails() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            val role = _state.value.role.lowercase()
            if (role == "doctor") {
                val doctorId = repo.getDoctorIdFlow().first()
                if (doctorId != null && doctorId > 0) {
                    when (val docProfileRes = repo.getDoctorProfile(doctorId)) {
                        is Result.Success -> {
                            val dp = docProfileRes.data
                            _state.update { it.copy(
                                doctorProfile = dp,
                                phoneNumber = dp.doctor.phoneNumber ?: "N/A",
                                universityId = dp.doctor.email.split("@").firstOrNull()?.uppercase() ?: "STAFF-${dp.doctor.id}",
                                departmentName = dp.doctor.departments?.joinToString(", ") { it.name } ?: "N/A",
                                facultyName = dp.doctor.faculties?.joinToString(", ") { it.name } ?: "N/A"
                            ) }
                        }
                        else -> {}
                    }
                }
            } else if (role == "engineer" || role == "instructor") {
                val instructorId = repo.getInstructorIdFlow().first()
                if (instructorId != null && instructorId > 0) {
                    when (val instProfileRes = repo.getInstructorProfile(instructorId)) {
                        is Result.Success -> {
                            val ip = instProfileRes.data
                            _state.update { it.copy(
                                instructorProfile = ip,
                                phoneNumber = ip.instructor.phoneNumber ?: "N/A",
                                universityId = ip.instructor.email.split("@").firstOrNull()?.uppercase() ?: "STAFF-${ip.instructor.id}",
                                departmentName = ip.instructor.departments?.joinToString(", ") { it.name } ?: "N/A",
                                facultyName = ip.instructor.faculties?.joinToString(", ") { it.name } ?: "N/A"
                            ) }
                        }
                        else -> {}
                    }
                }
            }

            // Fallback for basic info if profiles aren't seeded yet
            if (_state.value.universityId.isEmpty() || _state.value.universityId == "N/A") {
                val deptIds = repo.getAssignedDeptsFlow().first()?.split(",")?.mapNotNull { it.toIntOrNull() } ?: emptyList()
                if (deptIds.isNotEmpty()) {
                    when (val deptRes = repo.getDepartments()) {
                        is Result.Success -> {
                            val names = deptRes.data.filter { it.id in deptIds }.map { it.name }
                            if (names.isNotEmpty()) {
                                _state.update { it.copy(departmentName = names.joinToString(", ")) }
                            }
                        }
                        else -> {}
                    }
                }

                when (val res = repo.getUsers()) {
                    is Result.Success -> {
                        val me = res.data.find { it.id == _state.value.userId }
                        me?.let { u ->
                            _state.update { it.copy(
                                phoneNumber = u.phoneNumber ?: "N/A",
                                universityId = u.email.split("@").firstOrNull()?.uppercase() ?: "STAFF-${u.id}"
                            ) }
                        }
                    }
                    else -> {}
                }
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    private fun loadStudentDetails() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val studentId = repo.getStudentIdFlow().first() ?: 0
            
            when (val profileRes = repo.getStudentProfile(studentId)) {
                is Result.Success -> {
                    val p = profileRes.data
                    _state.update { it.copy(
                        studentInfo = p.student,
                        universityId = p.student.universityId ?: "N/A",
                        facultyName = p.facultyName ?: "N/A",
                        departmentName = p.departmentName ?: "N/A",
                        attendanceRate = p.attendancePercentage,
                        totalSessions = p.totalSessions
                    ) }
                }
                is Result.Error -> {
                    // Fallback to basic student fetch if profile endpoint fails
                    val email = _state.value.email
                    when (val studentResult = repo.getStudents()) {
                        is Result.Success -> {
                            val me = studentResult.data.find { it.email == email }
                            _state.update { it.copy(
                                studentInfo = me,
                                universityId = me?.universityId ?: "N/A"
                            ) }
                            
                            if (me?.departmentId != null) {
                                when (val deptResult = repo.getDepartments()) {
                                    is Result.Success -> {
                                        val dept = deptResult.data.find { it.id == me.departmentId }
                                        _state.update { it.copy(departmentName = dept?.name ?: "Unknown") }
                                    }
                                    else -> {}
                                }
                            }
                        }
                        else -> {}
                    }
                }
                else -> {}
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repo.logout()
            _state.update { it.copy(isLoggedOut = true) }
        }
    }

    fun onProfileImageSelected(context: android.content.Context, uri: android.net.Uri) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                val bytes = inputStream?.readBytes()
                inputStream?.close()

                if (bytes != null) {
                    val mediaType = "image/*".toMediaTypeOrNull()
                    val reqFile = bytes.toRequestBody(mediaType)
                    val body = MultipartBody.Part.createFormData("file", "profile.jpg", reqFile)

                    when (val r = repo.uploadProfileImage(body)) {
                        is Result.Success -> {
                            val newUrl = r.data["profile_image_url"] ?: ""
                            _state.update { it.copy(profileImageUrl = newUrl) }
                            // Also need to save to tokenStore so it persists across reloads!
                        }
                        is Result.Error -> {
                            // Handle error
                        }
                        else -> {}
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            _state.update { it.copy(isLoading = false) }
        }
    }
}
