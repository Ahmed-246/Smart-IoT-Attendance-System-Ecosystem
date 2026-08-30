package com.attendance.app.ui.hierarchy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.Course
import com.attendance.app.model.Department
import com.attendance.app.model.Faculty
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HierarchyUiState(
    val faculties: List<Faculty> = emptyList(),
    val departments: List<Department> = emptyList(),
    val courses: List<Course> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class HierarchyViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(HierarchyUiState())
    val state = _state.asStateFlow()

    init {
        loadAll()
    }

    private fun loadAll() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            val fResp = repo.getFaculties()
            val dResp = repo.getDepartments()
            val cResp = repo.getCourses()

            _state.update {
                it.copy(
                    isLoading = false,
                    faculties = if (fResp is Result.Success) fResp.data else emptyList(),
                    departments = if (dResp is Result.Success) dResp.data else emptyList(),
                    courses = if (cResp is Result.Success) cResp.data else emptyList()
                )
            }
        }
    }
}
