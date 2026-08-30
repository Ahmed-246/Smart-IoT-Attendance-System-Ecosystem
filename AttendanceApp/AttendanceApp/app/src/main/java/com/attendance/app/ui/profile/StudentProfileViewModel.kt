package com.attendance.app.ui.profile

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.AttendanceRecord
import com.attendance.app.model.Course
import com.attendance.app.model.GradeResult
import com.attendance.app.model.Student
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StudentProfileUiState(
    val student: Student? = null,
    val facultyName: String = "—",
    val departmentName: String = "—",
    val attendancePercentage: Double = 0.0,
    val totalSessions: Int = 0,
    val attendedSessions: Int = 0,
    val enrolledCourses: List<Course> = emptyList(),
    val grades: List<GradeResult> = emptyList(),
    val attendanceHistory: List<AttendanceRecord> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
)

@HiltViewModel
class StudentProfileViewModel @Inject constructor(
    private val repo: AttendanceRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val _state = MutableStateFlow(StudentProfileUiState())
    val state = _state.asStateFlow()

    private val studentId: Int = savedStateHandle.get<Int>("studentId") ?: -1

    init {
        if (studentId > 0) {
            loadStudentProfile(studentId)
        } else {
            _state.update { it.copy(isLoading = false, error = "Invalid student ID") }
        }
    }

    fun loadStudentProfile(id: Int) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            when (val result = repo.getStudentProfile(id)) {
                is Result.Success -> {
                    val profile = result.data
                    _state.update {
                        it.copy(
                            isLoading = false,
                            student = profile.student,
                            facultyName = profile.facultyName ?: "—",
                            departmentName = profile.departmentName ?: "—",
                            attendancePercentage = profile.attendancePercentage,
                            totalSessions = profile.totalSessions,
                            attendedSessions = profile.attendedSessions,
                            enrolledCourses = profile.enrolledCourses,
                            grades = profile.committedGrades,
                            attendanceHistory = profile.attendanceHistory
                        )
                    }
                }
                is Result.Error -> {
                    // Fallback: try fetching the student from the students list
                    fallbackLoadStudent(id, result.message)
                }
                else -> {
                    _state.update { it.copy(isLoading = false) }
                }
            }
        }
    }

    private suspend fun fallbackLoadStudent(id: Int, originalError: String) {
        when (val studentsResult = repo.getStudents()) {
            is Result.Success -> {
                val student = studentsResult.data.find { it.id == id }
                if (student != null) {
                    // Resolve department name
                    var deptName = "—"
                    if (student.departmentId != null) {
                        when (val deptResult = repo.getDepartments()) {
                            is Result.Success -> {
                                deptName = deptResult.data.find { it.id == student.departmentId }?.name ?: "—"
                            }
                            else -> {}
                        }
                    }
                    _state.update {
                        it.copy(
                            isLoading = false,
                            student = student,
                            departmentName = deptName
                        )
                    }
                } else {
                    _state.update { it.copy(isLoading = false, error = "Student not found") }
                }
            }
            is Result.Error -> {
                _state.update { it.copy(isLoading = false, error = originalError) }
            }
            else -> {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }

    fun retry() {
        if (studentId > 0) {
            loadStudentProfile(studentId)
        }
    }
}
