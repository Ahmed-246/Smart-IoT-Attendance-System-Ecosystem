package com.attendance.app.ui.management

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.UserOut
import com.attendance.app.model.UserCreate
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class UserManagementState(
    val isLoading: Boolean = false,
    val users: List<UserOut> = emptyList(),
    val error: String? = null,
    val isCreating: Boolean = false
)

@HiltViewModel
class UserViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(UserManagementState())
    val state = _state.asStateFlow()

    init {
        loadUsers()
    }

    fun loadUsers() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            when (val res = repo.getUsers()) {
                is Result.Success -> _state.value = _state.value.copy(isLoading = false, users = res.data)
                is Result.Error -> _state.value = _state.value.copy(isLoading = false, error = res.message)
                else -> {}
            }
        }
    }

    fun createUser(req: UserCreate) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isCreating = true)
            when (val res = repo.createUser(req)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isCreating = false)
                    loadUsers() // Refresh list
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(isCreating = false, error = res.message)
                }
                else -> {}
            }
        }
    }

    fun deleteUser(id: Int) {
        viewModelScope.launch {
            when (val res = repo.deleteUser(id)) {
                is Result.Success -> loadUsers()
                is Result.Error -> _state.value = _state.value.copy(error = res.message)
                else -> {}
            }
        }
    }
}
