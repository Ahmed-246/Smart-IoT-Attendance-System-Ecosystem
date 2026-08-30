package com.attendance.app.ui.nfc

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.api.AttendanceApi
import com.attendance.app.model.ScanRequest
import com.attendance.app.hardware.nfc.NfcEngine
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import retrofit2.HttpException
import javax.inject.Inject

data class NfcScannerState(
    val isLoading: Boolean = false,
    val lastScannedUid: String? = null,
    val message: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class NfcScannerViewModel @Inject constructor(
    private val nfcEngine: NfcEngine,
    private val api: AttendanceApi
) : ViewModel() {

    private val _state = MutableStateFlow(NfcScannerState())
    val state: StateFlow<NfcScannerState> = _state

    init {
        // Observe scanned tags from the hardware engine
        viewModelScope.launch {
            nfcEngine.scannedTags.collectLatest { uid ->
                _state.update { it.copy(lastScannedUid = uid, isLoading = true, message = null) }
                processScan(uid)
            }
        }
    }

    fun enableNfc(activity: Activity) {
        nfcEngine.enableReaderMode(activity)
    }

    fun disableNfc(activity: Activity) {
        nfcEngine.disableReaderMode(activity)
    }

    private suspend fun processScan(uid: String) {
        try {
            // Assume device_id is 'mobile_scanner' for manual phone scans
            val request = ScanRequest(
                rfid_uid = uid,
                device_id = "mobile_scanner"
            )
            val response = api.recordAttendance(request)
            
            _state.update { 
                it.copy(
                    isLoading = false, 
                    isSuccess = response.isSuccessful, 
                    message = response.body()?.message ?: "Scan processed."
                ) 
            }
        } catch (e: Exception) {
            val errorMessage = if (e is HttpException) {
                // Try to parse standard API error from the backend DNA
                "Scan failed. Session invalid or student already scanned."
            } else {
                "Network error. Cannot reach server."
            }
            
            _state.update { 
                it.copy(
                    isLoading = false, 
                    isSuccess = false, 
                    message = errorMessage
                ) 
            }
        }
    }
}
