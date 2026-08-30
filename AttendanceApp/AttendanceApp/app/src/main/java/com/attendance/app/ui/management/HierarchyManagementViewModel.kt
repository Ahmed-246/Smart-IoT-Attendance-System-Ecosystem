package com.attendance.app.ui.management

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.Faculty
import com.attendance.app.model.Department
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HierarchyManagementState(
    val isLoading: Boolean = false,
    val faculties: List<Faculty> = emptyList(),
    val departments: List<Department> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class HierarchyManagementViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(HierarchyManagementState())
    val state = _state.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val fRes = repo.getFaculties()
            val dRes = repo.getDepartments()

            if (fRes is Result.Success && dRes is Result.Success) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    faculties = fRes.data,
                    departments = dRes.data
                )
            } else {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = "Failed to synchronize hierarchy data"
                )
            }
        }
    }

    fun addFaculty(name: String, description: String?) {
        viewModelScope.launch {
            when (val res = repo.createFaculty(name, description)) {
                is Result.Success -> loadData()
                is Result.Error -> _state.value = _state.value.copy(error = res.message)
                else -> {}
            }
        }
    }

    fun addDepartment(name: String, facultyId: Int, description: String?) {
        viewModelScope.launch {
            when (val res = repo.createDepartment(name, facultyId, description)) {
                is Result.Success -> loadData()
                is Result.Error -> _state.value = _state.value.copy(error = res.message)
                else -> {}
            }
        }
    }
}
