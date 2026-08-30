package com.attendance.app.ui.courses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.Assessment
import com.attendance.app.model.Course
import com.attendance.app.model.CourseCreate
import com.attendance.app.model.Faculty
import com.attendance.app.model.Department
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CourseManagementUiState(
    val courses: List<Course> = emptyList(),
    val filteredCourses: List<Course> = emptyList(),
    val assessments: List<Assessment> = emptyList(),
    val selectedCourseId: Int? = null,
    val isLoading: Boolean = false,
    val isCreatingAssessment: Boolean = false,
    val isCreatingCourse: Boolean = false,
    val error: String? = null,
    val showCreateDialog: Boolean = false,
    val showCreateCourseDialog: Boolean = false,
    val userRole: String = "student",
    
    // Filters
    val faculties: List<Faculty> = emptyList(),
    val departments: List<Department> = emptyList(),
    val selectedFacultyId: Int? = null,
    val selectedDepartmentId: Int? = null,
    val selectedYear: Int? = null,
    val selectedSemester: Int? = null,
    val showFilters: Boolean = false
)

@HiltViewModel
class CourseManagementViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(CourseManagementUiState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            repo.getRoleFlow().distinctUntilChanged().collect { role ->
                _state.update { it.copy(userRole = role ?: "student") }
                loadData()
            }
        }
    }

    private fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            val coursesResp = repo.getCourses()
            val courses = if (coursesResp is Result.Success) coursesResp.data else emptyList()

            val assessResp = repo.getAssessments()
            val assessments = if (assessResp is Result.Success) assessResp.data else emptyList()

            val facResp = repo.getFaculties()
            val faculties = if (facResp is Result.Success) facResp.data else emptyList()

            val deptResp = repo.getDepartments()
            val departments = if (deptResp is Result.Success) deptResp.data else emptyList()

            _state.update {
                val filtered = getFilteredCoursesList(
                    courses = courses,
                    departments = departments,
                    facId = it.selectedFacultyId,
                    deptId = it.selectedDepartmentId,
                    year = it.selectedYear,
                    sem = it.selectedSemester
                )
                it.copy(
                    isLoading = false,
                    courses = courses,
                    filteredCourses = filtered,
                    assessments = assessments,
                    faculties = faculties,
                    departments = departments,
                    selectedCourseId = if (it.selectedCourseId in filtered.map { c -> c.id }) it.selectedCourseId else filtered.firstOrNull()?.id
                )
            }
        }
    }

    private fun getFilteredCoursesList(
        courses: List<Course>,
        departments: List<Department>,
        facId: Int?,
        deptId: Int?,
        year: Int?,
        sem: Int?
    ): List<Course> {
        return courses.filter { course ->
            val matchesFaculty = facId == null || run {
                val dept = departments.find { it.id == course.departmentId }
                dept?.facultyId == facId
            }
            val matchesDept = deptId == null || course.departmentId == deptId
            val matchesYear = year == null || course.academicYear == year
            val matchesSemester = sem == null || course.semester == sem
            matchesFaculty && matchesDept && matchesYear && matchesSemester
        }
    }

    fun setFacultyFilter(id: Int?) {
        _state.update { s ->
            val currentDept = s.departments.find { it.id == s.selectedDepartmentId }
            val newDeptId = if (currentDept != null && currentDept.facultyId == id) {
                s.selectedDepartmentId
            } else {
                null
            }
            val filtered = getFilteredCoursesList(s.courses, s.departments, id, newDeptId, s.selectedYear, s.selectedSemester)
            val nextSelected = if (s.selectedCourseId in filtered.map { it.id }) s.selectedCourseId else filtered.firstOrNull()?.id
            
            s.copy(
                selectedFacultyId = id,
                selectedDepartmentId = newDeptId,
                filteredCourses = filtered,
                selectedCourseId = nextSelected
            )
        }
    }

    fun setDepartmentFilter(id: Int?) {
        _state.update { s ->
            val facultyId = if (id != null) {
                s.departments.find { it.id == id }?.facultyId
            } else {
                s.selectedFacultyId
            }
            val filtered = getFilteredCoursesList(s.courses, s.departments, facultyId, id, s.selectedYear, s.selectedSemester)
            val nextSelected = if (s.selectedCourseId in filtered.map { it.id }) s.selectedCourseId else filtered.firstOrNull()?.id
            
            s.copy(
                selectedDepartmentId = id,
                selectedFacultyId = facultyId,
                filteredCourses = filtered,
                selectedCourseId = nextSelected
            )
        }
    }

    fun setYearFilter(year: Int?) {
        _state.update { s ->
            val filtered = getFilteredCoursesList(s.courses, s.departments, s.selectedFacultyId, s.selectedDepartmentId, year, s.selectedSemester)
            val nextSelected = if (s.selectedCourseId in filtered.map { it.id }) s.selectedCourseId else filtered.firstOrNull()?.id
            
            s.copy(
                selectedYear = year,
                filteredCourses = filtered,
                selectedCourseId = nextSelected
            )
        }
    }

    fun setSemesterFilter(semester: Int?) {
        _state.update { s ->
            val filtered = getFilteredCoursesList(s.courses, s.departments, s.selectedFacultyId, s.selectedDepartmentId, s.selectedYear, semester)
            val nextSelected = if (s.selectedCourseId in filtered.map { it.id }) s.selectedCourseId else filtered.firstOrNull()?.id
            
            s.copy(
                selectedSemester = semester,
                filteredCourses = filtered,
                selectedCourseId = nextSelected
            )
        }
    }

    fun toggleFilters() {
        _state.update { it.copy(showFilters = !it.showFilters) }
    }

    fun clearFilters() {
        _state.update { s ->
            val filtered = s.courses
            s.copy(
                selectedFacultyId = null,
                selectedDepartmentId = null,
                selectedYear = null,
                selectedSemester = null,
                filteredCourses = filtered,
                selectedCourseId = if (s.selectedCourseId in filtered.map { it.id }) s.selectedCourseId else filtered.firstOrNull()?.id
            )
        }
    }

    fun selectCourse(id: Int) {
        _state.update { it.copy(selectedCourseId = id) }
    }

    fun showCreateDialog(show: Boolean) {
        _state.update { it.copy(showCreateDialog = show) }
    }

    fun createAssessment(title: String, type: String, maxScore: String) {
        val courseId = _state.value.selectedCourseId ?: return
        val score = maxScore.toDoubleOrNull() ?: 100.0

        if (title.isBlank() || type.isBlank()) {
            _state.update { it.copy(error = "Title and Type cannot be empty") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isCreatingAssessment = true, error = null) }
            when (val r = repo.createAssessment(courseId, title, type, score)) {
                is Result.Success -> {
                    val newList = _state.value.assessments.toMutableList()
                    newList.add(0, r.data)
                    _state.update { it.copy(isCreatingAssessment = false, showCreateDialog = false, assessments = newList) }
                }
                is Result.Error -> _state.update { it.copy(isCreatingAssessment = false, error = r.message) }
                else -> {}
            }
        }
    }

    fun showCreateCourseDialog(show: Boolean) {
        _state.update { it.copy(showCreateCourseDialog = show) }
    }

    fun createCourse(req: CourseCreate) {
        viewModelScope.launch {
            _state.update { it.copy(isCreatingCourse = true, error = null) }
            when (val r = repo.createCourse(req)) {
                is Result.Success -> {
                    _state.update { it.copy(isCreatingCourse = false, showCreateCourseDialog = false) }
                    loadData()
                }
                is Result.Error -> _state.update { it.copy(isCreatingCourse = false, error = r.message) }
                else -> {}
            }
        }
    }

    fun deleteCourse(id: Int) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val r = repo.deleteCourse(id)) {
                is Result.Success -> loadData()
                is Result.Error -> _state.update { it.copy(isLoading = false, error = r.message) }
                else -> {}
            }
        }
    }
}
