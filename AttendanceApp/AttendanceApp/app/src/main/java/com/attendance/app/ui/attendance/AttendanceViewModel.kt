package com.attendance.app.ui.attendance

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.AttendanceRecord
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AttendanceViewModel @Inject constructor(
    private val repository: AttendanceRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val studentId: Int = checkNotNull(savedStateHandle["studentId"])

    private val _records = MutableStateFlow<List<AttendanceRecord>>(emptyList())
    val records: StateFlow<List<AttendanceRecord>> = _records

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = repository.getStudentAttendance(studentId)) {
                is Result.Success -> {
                    _records.value = result.data.sortedByDescending { it.timestamp }
                }
                is Result.Error -> {
                    // In a production app, we might handle errors via a UI event channel
                }
                else -> {}
            }
            _isLoading.value = false
        }
    }
}
