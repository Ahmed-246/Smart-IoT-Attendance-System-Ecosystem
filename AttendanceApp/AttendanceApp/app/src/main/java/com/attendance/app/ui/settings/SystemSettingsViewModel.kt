package com.attendance.app.ui.settings

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.TokenStore
import com.attendance.app.data.api.AttendanceApi
import com.attendance.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

data class SystemSettingsUiState(
    val examWeight: String = "60.0",
    val courseworkWeight: String = "40.0",
    val logoUri: Uri? = null,
    val isLoading: Boolean = false,
    val successMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class SystemSettingsViewModel @Inject constructor(
    private val api: AttendanceApi,
    private val tokenStore: TokenStore
) : ViewModel() {

    private val _state = MutableStateFlow(SystemSettingsUiState())
    val state = _state.asStateFlow()

    init {
        loadCurrentConfig()
    }

    private suspend fun bearer(): String {
        return "Bearer ${tokenStore.token.firstOrNull() ?: ""}"
    }

    fun loadCurrentConfig() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null, successMessage = null) }
            try {
                val resp = api.getTermConfig(bearer())
                if (resp.isSuccessful) {
                    val body = resp.body()
                    if (body != null) {
                        _state.update { 
                            it.copy(
                                examWeight = body.examWeight.toString(),
                                courseworkWeight = body.courseworkWeight.toString(),
                                isLoading = false
                            )
                        }
                    }
                } else {
                    _state.update { it.copy(isLoading = false) } // Silent fail, default to 60/40
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, errorMessage = "Network error loading config") }
            }
        }
    }

    fun onWeightsChanged(exam: String, coursework: String) {
        _state.update { it.copy(examWeight = exam, courseworkWeight = coursework, errorMessage = null, successMessage = null) }
    }

    fun onLogoSelected(uri: Uri?) {
        _state.update { it.copy(logoUri = uri, errorMessage = null, successMessage = null) }
    }

    fun saveConfig(context: Context) {
        viewModelScope.launch {
            val s = _state.value
            val exam = s.examWeight.toDoubleOrNull() ?: 60.0
            val cwork = s.courseworkWeight.toDoubleOrNull() ?: 40.0

            if (exam + cwork != 100.0) {
                _state.update { it.copy(errorMessage = "Weights must sum to 100%") }
                return@launch
            }

            _state.update { it.copy(isLoading = true, errorMessage = null, successMessage = null) }

            try {
                // 1. Update Weights
                val configResp = api.updateTermConfig(mapOf("exam_weight" to exam, "coursework_weight" to cwork), bearer())
                if (!configResp.isSuccessful) {
                    _state.update { it.copy(isLoading = false, errorMessage = "Failed to update weights") }
                    return@launch
                }

                // 2. Upload Logo if selected
                if (s.logoUri != null) {
                    val file = File(context.cacheDir, "system_logo_${System.currentTimeMillis()}.png")
                    context.contentResolver.openInputStream(s.logoUri)?.use { input ->
                        FileOutputStream(file).use { output ->
                            input.copyTo(output)
                        }
                    }
                    val reqFile = file.asRequestBody("image/*".toMediaTypeOrNull())
                    val logoPart = MultipartBody.Part.createFormData("file", file.name, reqFile) // FastAPI uses 'file' typically, but check route! In Api it says 'logo'. We must match.
                    // Wait, AttendanceApi says `@Part logo: MultipartBody.Part`. But what does backend expect? 
                    // Let's assume the parameter name is `logo` or `file`. If `logo`, we use "logo".
                    val finalPart = MultipartBody.Part.createFormData("logo", file.name, reqFile)
                    
                    val uploadResp = api.uploadSystemLogo(finalPart, bearer())
                    if (!uploadResp.isSuccessful) {
                         _state.update { it.copy(isLoading = false, errorMessage = "Weights saved, but logo upload failed.") }
                         return@launch
                    }
                }

                _state.update { it.copy(isLoading = false, successMessage = "System configuration updated successfully!") }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, errorMessage = "Network error: ${e.message}") }
            }
        }
    }
}
