package com.attendance.app.hardware.nfc

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.util.Log
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * High-end NFC wrapper to read RFID tags (MIFARE Classic 1K, etc.)
 * Provides a decoupled Flow of scanned UIDs.
 */
@Singleton
class NfcEngine @Inject constructor() : NfcAdapter.ReaderCallback {

    private var nfcAdapter: NfcAdapter? = null
    
    private val _scannedTags = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val scannedTags: SharedFlow<String> = _scannedTags

    fun enableReaderMode(activity: Activity) {
        nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
        if (nfcAdapter == null) {
            Log.e("NfcEngine", "Device does not support NFC")
            return
        }

        // Flags for reading tags and disabling platform sounds
        val flags = NfcAdapter.FLAG_READER_NFC_A or 
                    NfcAdapter.FLAG_READER_NFC_B or 
                    NfcAdapter.FLAG_READER_NFC_F or 
                    NfcAdapter.FLAG_READER_NFC_V or 
                    NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS

        nfcAdapter?.enableReaderMode(activity, this, flags, null)
        Log.d("NfcEngine", "NFC Reader Mode Enabled")
    }

    fun disableReaderMode(activity: Activity) {
        nfcAdapter?.disableReaderMode(activity)
        Log.d("NfcEngine", "NFC Reader Mode Disabled")
    }

    override fun onTagDiscovered(tag: Tag?) {
        tag?.let {
            val uidBytes = it.id
            val uidString = bytesToHex(uidBytes)
            Log.d("NfcEngine", "Discovered Tag UID: $uidString")
            _scannedTags.tryEmit(uidString)
        }
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val hexChars = CharArray(bytes.size * 2)
        for (j in bytes.indices) {
            val v = bytes[j].toInt() and 0xFF
            hexChars[j * 2] = hexArray[v ushr 4]
            hexChars[j * 2 + 1] = hexArray[v and 0x0F]
        }
        return String(hexChars)
    }

    companion object {
        private val hexArray = "0123456789ABCDEF".toCharArray()
    }
}
