package com.attendance.app.ui.register

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

data class RegistrationUiState(
    val step: Int = 1, // 1: Email, 2: Verification, 3: Details, 4: Success
    val email: String = "",
    val token: String = "",
    val name: String = "",
    val password: String = "",
    val phone: String = "",
    val universityId: String = "",
    val departmentId: String = "",
    val academicYear: String = "",
    val idCardUri: Uri? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class RegistrationViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(RegistrationUiState())
    val state = _state.asStateFlow()

    fun updateField(field: String, value: String) {
        _state.update { it.copy(error = null) }
        when (field) {
            "email" -> _state.update { it.copy(email = value) }
            "token" -> _state.update { it.copy(token = value) }
            "name" -> _state.update { it.copy(name = value) }
            "password" -> _state.update { it.copy(password = value) }
            "phone" -> _state.update { it.copy(phone = value) }
            "universityId" -> _state.update { it.copy(universityId = value) }
            "departmentId" -> _state.update { it.copy(departmentId = value) }
            "academicYear" -> _state.update { it.copy(academicYear = value) }
        }
    }

    fun onImageSelected(uri: Uri?) {
        _state.update { it.copy(idCardUri = uri, error = null) }
    }

    fun initiateRegistration() {
        val email = _state.value.email.trim()
        if (email.isBlank() || !email.contains("@")) {
            _state.update { it.copy(error = "Please enter a valid institution email") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val r = repo.registerInit(email)) {
                is Result.Success -> _state.update { it.copy(isLoading = false, step = 2) }
                is Result.Error -> _state.update { it.copy(isLoading = false, error = r.message) }
                else -> {}
            }
        }
    }

    fun verifyToken() {
        val s = _state.value
        if (s.token.isBlank()) {
            _state.update { it.copy(error = "Enter the verification token") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            when (val r = repo.registerVerify(s.email, s.token)) {
                is Result.Success -> _state.update { it.copy(isLoading = false, step = 3) }
                is Result.Error -> _state.update { it.copy(isLoading = false, error = r.message) }
                else -> {}
            }
        }
    }

    fun submitRegistration(context: Context) {
        val s = _state.value
        if (s.name.isBlank() || s.password.isBlank() || s.phone.isBlank() || s.universityId.isBlank() ||
            s.departmentId.isBlank() || s.academicYear.isBlank() || s.idCardUri == null) {
            _state.update { it.copy(error = "All fields including ID Card upload are required.") }
            return
        }
        
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                // Copy URI to a temporary file
                val file = File(context.cacheDir, "id_card_${System.currentTimeMillis()}.jpg")
                context.contentResolver.openInputStream(s.idCardUri)?.use { input ->
                    FileOutputStream(file).use { output ->
                        input.copyTo(output)
                    }
                }

                val reqFile = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val idCardPart = MultipartBody.Part.createFormData("id_card", file.name, reqFile)

                val nameRb = s.name.toRequestBody("text/plain".toMediaTypeOrNull())
                val emailRb = s.email.toRequestBody("text/plain".toMediaTypeOrNull())
                val passRb = s.password.toRequestBody("text/plain".toMediaTypeOrNull())
                val phoneRb = s.phone.toRequestBody("text/plain".toMediaTypeOrNull())
                val uniIdRb = s.universityId.toRequestBody("text/plain".toMediaTypeOrNull())
                val deptIdRb = s.departmentId.toRequestBody("text/plain".toMediaTypeOrNull())
                val yearRb = s.academicYear.toRequestBody("text/plain".toMediaTypeOrNull())

                when (val r = repo.registerComplete(nameRb, emailRb, passRb, phoneRb, uniIdRb, deptIdRb, yearRb, idCardPart)) {
                    is Result.Success -> _state.update { it.copy(isLoading = false, step = 4) }
                    is Result.Error -> _state.update { it.copy(isLoading = false, error = r.message) }
                    else -> {}
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Failed to process image: ${e.message}") }
            }
        }
    }
}
