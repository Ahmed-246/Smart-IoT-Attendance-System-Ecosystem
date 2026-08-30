package com.attendance.app.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingUiState(
    val pendingStudents: List<Student> = emptyList(),
    val approvedHistory: List<Student> = emptyList(),
    val rejectedHistory: List<Student> = emptyList(),
    val allowlist: List<PreVerifiedStudentOut> = emptyList(),
    val autoApproveHistory: List<AutoApproveHistoryItem> = emptyList(),
    val faculties: List<Faculty> = emptyList(),
    val departments: List<Department> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMsg: String? = null,
    val selectedTab: Int = 0,
    val unseenAutoApproveCount: Int = 0
)

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(OnboardingUiState())
    val state = _state.asStateFlow()

    init {
        loadAll()
    }

    fun loadAll() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            // Load structure first
            val facRes = repo.getFaculties()
            val deptRes = repo.getDepartments()
            
            if (facRes is Result.Success) _state.update { it.copy(faculties = facRes.data) }
            if (deptRes is Result.Success) _state.update { it.copy(departments = deptRes.data) }

            // Load primary data based on tab or all
            refreshCurrentTab()
        }
    }

    fun setTab(index: Int) {
        _state.update { it.copy(selectedTab = index) }
        refreshCurrentTab()
    }

    fun refreshCurrentTab() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            when (state.value.selectedTab) {
                0 -> loadPending()
                1 -> loadHistory()
                2 -> loadAllowlist()
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    private suspend fun loadPending() {
        when (val r = repo.getPendingStudents()) {
            is Result.Success -> _state.update { it.copy(pendingStudents = r.data) }
            is Result.Error -> _state.update { it.copy(error = r.message) }
            else -> {}
        }
    }

    private suspend fun loadHistory() {
        val appRes = repo.getRegistrationHistory("APPROVED")
        val rejRes = repo.getRegistrationHistory("REJECTED")
        
        if (appRes is Result.Success) _state.update { it.copy(approvedHistory = appRes.data) }
        if (rejRes is Result.Success) _state.update { it.copy(rejectedHistory = rejRes.data) }
    }

    private suspend fun loadAllowlist() {
        val listRes = repo.getPreVerified()
        val histRes = repo.getPreVerifiedHistory()
        
        if (listRes is Result.Success) _state.update { it.copy(allowlist = listRes.data) }
        if (histRes is Result.Success) {
            val history = (histRes.data["history"] as? List<Map<String, Any>>)?.map {
                AutoApproveHistoryItem(
                    id = (it["id"] as Double).toInt(),
                    name = it["name"] as String,
                    email = it["email"] as String,
                    universityId = it["university_id"] as String,
                    approvedAt = it["approved_at"] as String,
                    adminName = it["admin_name"] as String,
                    adminSeen = it["admin_seen_auto_approve"] as Boolean
                )
            } ?: emptyList()
            _state.update { it.copy(
                autoApproveHistory = history,
                unseenAutoApproveCount = (histRes.data["unseen_count"] as? Double)?.toInt() ?: 0
            ) }
        }
    }

    fun approve(id: Int) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            when (val r = repo.approveStudent(id)) {
                is Result.Success -> {
                    _state.update { it.copy(successMsg = "Student approved successfully") }
                    refreshCurrentTab()
                }
                is Result.Error -> _state.update { it.copy(error = r.message, isLoading = false) }
                else -> {}
            }
        }
    }

    fun reject(id: Int, reason: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            when (val r = repo.rejectStudent(id)) {
                is Result.Success -> {
                    _state.update { it.copy(successMsg = "Registration rejected") }
                    refreshCurrentTab()
                }
                is Result.Error -> _state.update { it.copy(error = r.message, isLoading = false) }
                else -> {}
            }
        }
    }

    fun addToAllowlist(universityId: String, name: String, deptId: Int, year: Int) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val dept = state.value.departments.find { it.id == deptId }
            val req = PreVerifiedStudentCreate(
                universityId = universityId,
                name = name,
                phoneNumber = null,
                facultyId = dept?.facultyId,
                departmentId = deptId,
                academicYear = year
            )
            when (val r = repo.createPreVerified(req)) {
                is Result.Success -> {
                    _state.update { it.copy(successMsg = "Added to allowlist") }
                    loadAllowlist()
                }
                is Result.Error -> _state.update { it.copy(error = r.message) }
                else -> {}
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun removeFromAllowlist(id: Int) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            when (val r = repo.deletePreVerified(id)) {
                is Result.Success -> loadAllowlist()
                is Result.Error -> _state.update { it.copy(error = r.message) }
                else -> {}
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun markAutoApproveSeen() {
        viewModelScope.launch {
            repo.markPreVerifiedHistorySeen()
            _state.update { it.copy(unseenAutoApproveCount = 0) }
        }
    }

    fun clearMessages() {
        _state.update { it.copy(error = null, successMsg = null) }
    }
}
