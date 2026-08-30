package com.attendance.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ForgotPasswordUiState(
    val step: Int = 1,
    val phone: String = "",
    val token: String = "",
    val newPassword: String = "",
    val debugToken: String? = null,
    val error: String? = null,
    val successMsg: String? = null,
    val isLoading: Boolean = false
)

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ForgotPasswordUiState())
    val state = _state.asStateFlow()

    fun updatePhone(phone: String) {
        _state.update { it.copy(phone = phone) }
    }

    fun updateToken(token: String) {
        _state.update { it.copy(token = token) }
    }

    fun updateNewPassword(newPassword: String) {
        _state.update { it.copy(newPassword = newPassword) }
    }

    fun clearError() {
        _state.update { it.copy(error = null, successMsg = null) }
    }

    fun requestResetToken() {
        val phone = _state.value.phone.replace(" ", "").replace("-", "")
        if (phone.isBlank()) {
            _state.update { it.copy(error = "Phone number cannot be empty") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val res = repo.passwordForgot(phone)) {
                is Result.Success -> {
                    // In a live system, the token is sent via SMS.
                    // The backend returns the token in the response (for easy development/debugging or SMS stubbing).
                    val token = res.data["debug_token"] ?: res.data["token"]
                    _state.update { 
                        it.copy(
                            step = 2,
                            debugToken = token,
                            successMsg = "Verification token generated!"
                        )
                    }
                }
                is Result.Error -> {
                    _state.update { it.copy(error = res.message) }
                }
                else -> {}
            }
            _state.update { it.copy(isLoading = false) }
        }
    }

    fun resetPassword(onSuccess: () -> Unit) {
        val s = _state.value
        val phone = s.phone.replace(" ", "").replace("-", "")
        if (s.token.isBlank()) {
            _state.update { it.copy(error = "Token cannot be empty") }
            return
        }
        if (s.newPassword.isBlank()) {
            _state.update { it.copy(error = "New password cannot be empty") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val res = repo.passwordReset(phone, s.token, s.newPassword)) {
                is Result.Success -> {
                    _state.update { it.copy(successMsg = "Password successfully reset!") }
                    onSuccess()
                }
                is Result.Error -> {
                    _state.update { it.copy(error = res.message) }
                }
                else -> {}
            }
            _state.update { it.copy(isLoading = false) }
        }
    }
}
