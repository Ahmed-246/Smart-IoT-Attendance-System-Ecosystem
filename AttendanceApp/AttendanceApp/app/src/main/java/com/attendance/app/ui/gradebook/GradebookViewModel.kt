package com.attendance.app.ui.gradebook

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.GradeBulkCommit
import com.attendance.app.model.GradeResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class GradebookUiState(
    val assessmentId: Int = 0,
    val grades: List<GradeResult> = emptyList(),
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val successMsg: String? = null
)

@HiltViewModel
class GradebookViewModel @Inject constructor(
    private val repo: AttendanceRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val assessmentId: Int = savedStateHandle.get<String>("assessmentId")?.toIntOrNull() 
        ?: savedStateHandle.get<Int>("assessmentId") 
        ?: 0
    private val _state = MutableStateFlow(GradebookUiState(assessmentId = assessmentId))
    val state = _state.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val result = repo.getGradebook(assessmentId)) {
                is Result.Success -> _state.update { it.copy(grades = result.data) }
                is Result.Error -> _state.update { it.copy(error = result.message) }
                else -> {}
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun onGradeChanged(studentId: Int, newScore: String) {
        val score = newScore.toDoubleOrNull() ?: 0.0
        // Enforce 0-100 cap to solve "unlimited score" issue
        val cappedScore = score.coerceIn(0.0, 100.0)
        
        _state.update { s ->
            s.copy(grades = s.grades.map { 
                if (it.studentId == studentId) it.copy(rawScore = cappedScore, isAbsent = false) else it 
            })
        }
    }

    fun onToggleAbsent(studentId: Int) {
        _state.update { s ->
            s.copy(grades = s.grades.map {
                if (it.studentId == studentId) it.copy(isAbsent = !it.isAbsent, rawScore = if (!it.isAbsent) 0.0 else it.rawScore) else it
            })
        }
    }

    fun commitGrades(finalize: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true) }
            
            val body = GradeBulkCommit(
                grades = _state.value.grades.map { 
                    com.attendance.app.model.BulkGradeUpdate(
                        studentId = it.studentId,
                        rawScore = it.rawScore,
                        instructorRemarks = null,
                        isFlagged = it.isFlagged,
                        isAbsent = it.isAbsent
                    )
                },
                instructorId = null,
                finalize = finalize
            )
            
            when (val result = repo.commitGrades(assessmentId, body)) {
                is Result.Success -> {
                    _state.update { it.copy(successMsg = if (finalize) "Grades Finalized!" else "Grades Saved!") }
                    loadData()
                }
                is Result.Error -> _state.update { it.copy(error = result.message) }
                else -> {}
            }
            _state.update { it.copy(isSaving = false) }
        }
    }

    fun clearMessages() = _state.update { it.copy(error = null, successMsg = null) }
}
