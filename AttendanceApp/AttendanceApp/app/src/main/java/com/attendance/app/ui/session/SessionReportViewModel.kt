package com.attendance.app.ui.session

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.AttendanceReport
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SessionReportUiState(
    val report: AttendanceReport? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SessionReportViewModel @Inject constructor(
    private val repo: AttendanceRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val sessionId: Int = savedStateHandle["sessionId"] ?: 0
    
    private val _state = MutableStateFlow(SessionReportUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val r = repo.getSessionReport(sessionId)) {
                is Result.Success -> _state.update { it.copy(report = r.data, isLoading = false) }
                is Result.Error -> _state.update { it.copy(error = r.message, isLoading = false) }
                else -> {}
            }
        }
    }
}
