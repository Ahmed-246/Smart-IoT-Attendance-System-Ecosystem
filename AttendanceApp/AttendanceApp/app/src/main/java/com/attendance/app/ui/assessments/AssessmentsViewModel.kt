package com.attendance.app.ui.assessments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.Assessment
import com.attendance.app.model.Course
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AssessmentsUiState(
    val assessments: List<Assessment> = emptyList(),
    val courses: List<Course> = emptyList(),
    val faculties: List<com.attendance.app.model.Faculty> = emptyList(),
    val departments: List<com.attendance.app.model.Department> = emptyList(),
    val selectedFacultyId: Int? = null,
    val selectedDeptId: Int? = null,
    val selectedYear: Int? = null,
    val selectedSemester: Int? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class AssessmentsViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(AssessmentsUiState())
    val state = _state.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            // Load academic structure
            val facultiesRes = repo.getFaculties()
            val deptsRes = repo.getDepartments()
            val courseResult = repo.getCourses()
            val assessmentsRes = repo.getAssessments()

            _state.update { it.copy(
                faculties = (facultiesRes as? Result.Success)?.data ?: emptyList(),
                departments = (deptsRes as? Result.Success)?.data ?: emptyList(),
                courses = (courseResult as? Result.Success)?.data ?: emptyList(),
                assessments = (assessmentsRes as? Result.Success)?.data ?: emptyList(),
                error = (assessmentsRes as? Result.Error)?.message
            ) }
            
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun setFaculty(id: Int?) = _state.update { it.copy(selectedFacultyId = id, selectedDeptId = null) }
    fun setDept(id: Int?) = _state.update { it.copy(selectedDeptId = id) }
    fun setYear(year: Int?) = _state.update { it.copy(selectedYear = year) }
    fun setSemester(sem: Int?) = _state.update { it.copy(selectedSemester = sem) }

    fun getFilteredAssessments(): List<Assessment> {
        val s = _state.value
        return s.assessments.filter { a ->
            val course = s.courses.find { it.id == a.courseId } ?: return@filter true
            val dept = s.departments.find { it.id == course.departmentId }
            
            (s.selectedFacultyId == null || dept?.facultyId == s.selectedFacultyId) &&
            (s.selectedDeptId == null || course.departmentId == s.selectedDeptId) &&
            (s.selectedYear == null || course.academicYear == s.selectedYear) &&
            (s.selectedSemester == null || course.semester == s.selectedSemester)
        }
    }

    fun clearError() = _state.update { it.copy(error = null) }
}
