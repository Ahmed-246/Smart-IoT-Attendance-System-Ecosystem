package com.attendance.app.ui.sessions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.Course
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CreateSessionUiState(
    val courses: List<Course> = emptyList(),
    val selectedCourseId: Int? = null,
    val isLoading: Boolean = false,
    val isLaunching: Boolean = false,
    val success: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class CreateSessionViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(CreateSessionUiState())
    val state = _state.asStateFlow()

    init {
        loadCourses()
    }

    private fun loadCourses() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val r = repo.getCourses()) {
                is Result.Success -> _state.update { it.copy(isLoading = false, courses = r.data) }
                is Result.Error -> _state.update { it.copy(isLoading = false, error = r.message) }
                else -> {}
            }
        }
    }

    fun selectCourse(id: Int) {
        _state.update { it.copy(selectedCourseId = id, error = null) }
    }

    fun launchSession() {
        val courseId = _state.value.selectedCourseId
        if (courseId == null) {
            _state.update { it.copy(error = "Please select a course to launch.") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLaunching = true, error = null) }
            when (val r = repo.createSession(courseId)) {
                is Result.Success -> _state.update { it.copy(isLaunching = false, success = true) }
                is Result.Error -> _state.update { it.copy(isLaunching = false, error = r.message) }
                else -> {}
            }
        }
    }
}
