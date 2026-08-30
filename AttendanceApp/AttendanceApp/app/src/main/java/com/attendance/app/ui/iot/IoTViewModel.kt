package com.attendance.app.ui.iot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.Student
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class IoUiState(
    val isScanning: Boolean = false,
    val capturedUid: String? = null,
    val students: List<Student> = emptyList(),
    val filteredStudents: List<Student> = emptyList(),
    val selectedStudent: Student? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMsg: String? = null
)

@HiltViewModel
class IoTViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(IoUiState())
    val state = _state.asStateFlow()

    init {
        loadStudents()
    }

    private fun loadStudents() {
        viewModelScope.launch {
            when (val r = repo.getStudents()) {
                is Result.Success -> _state.update { it.copy(students = r.data, filteredStudents = r.data) }
                else -> {}
            }
        }
    }

    fun onSearch(query: String) {
        val filtered = if (query.isBlank()) {
            _state.value.students
        } else {
            _state.value.students.filter { it.name.contains(query, ignoreCase = true) || it.universityId?.contains(query) == true }
        }
        _state.update { it.copy(filteredStudents = filtered) }
    }

    fun startDiscovery() {
        viewModelScope.launch {
            _state.update { it.copy(isScanning = true, capturedUid = null, error = null) }
            
            when (val r = repo.startDiscovery()) {
                is Result.Success -> {
                    val token = r.data["token"] as? String
                    if (token != null) {
                        pollDiscovery(token)
                    } else {
                        _state.update { it.copy(isScanning = false, error = "Invalid discovery token") }
                    }
                }
                is Result.Error -> _state.update { it.copy(isScanning = false, error = r.message) }
                else -> {}
            }
        }
    }

    private fun pollDiscovery(token: String) {
        viewModelScope.launch {
            var attempts = 0
            while (attempts < 60 && _state.value.isScanning) { // Poll for 5 minutes (5s intervals)
                attempts++
                when (val r = repo.checkDiscovery(token)) {
                    is Result.Success -> {
                        val uid = r.data.uid
                        if (uid != null) {
                            _state.update { it.copy(isScanning = false, capturedUid = uid) }
                            return@launch
                        }
                    }
                    else -> {}
                }
                delay(5000)
            }
            _state.update { it.copy(isScanning = false, error = "Discovery timed out") }
        }
    }

    fun selectStudent(student: Student) {
        _state.update { it.copy(selectedStudent = student) }
    }

    fun mapTag() {
        val student = _state.value.selectedStudent ?: return
        val uid = _state.value.capturedUid ?: return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val updates = mapOf("rfid_uid" to uid)
            when (val r = repo.updateStudent(student.id, updates)) {
                is Result.Success -> {
                    _state.update { it.copy(isLoading = false, successMsg = "Tag successfully mapped to ${student.name}", capturedUid = null, selectedStudent = null) }
                    loadStudents()
                }
                is Result.Error -> _state.update { it.copy(isLoading = false, error = r.message) }
                else -> {}
            }
        }
    }
}
