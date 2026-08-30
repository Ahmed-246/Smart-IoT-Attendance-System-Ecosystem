package com.attendance.app.hardware.wifi

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.net.NetworkInterface
import java.util.Collections
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WifiHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    private val _status = MutableStateFlow("Disconnected")
    val status: StateFlow<String> = _status.asStateFlow()
    
    private val _scanResults = MutableStateFlow<List<String>>(emptyList())
    val scanResults: StateFlow<List<String>> = _scanResults.asStateFlow()
    
    private val _currentIp = MutableStateFlow<String?>(null)
    val currentIp: StateFlow<String?> = _currentIp.asStateFlow()

    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    private val wifiScanReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val success = intent.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false)
            Log.d("WifiHelper", "Wifi scan results updated: $success")
            updateScanResults()
        }
    }

    init {
        // Automatically check current IP if already on Wi-Fi
        _currentIp.value = getLocalIpAddress()
    }

    @SuppressLint("MissingPermission")
    fun startScan() {
        Log.d("WifiHelper", "Starting wifi scan...")
        _status.value = "Scanning networks..."
        
        try {
            val filter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
            context.registerReceiver(wifiScanReceiver, filter)
            val success = wifiManager.startScan()
            if (!success) {
                // If startScan is throttled, fall back to cached results immediately
                updateScanResults()
            }
        } catch (e: Exception) {
            Log.e("WifiHelper", "Failed to start wifi scan", e)
            _status.value = "Scan Error: ${e.message}"
        }
    }

    fun stopScan() {
        try {
            context.unregisterReceiver(wifiScanReceiver)
        } catch (e: Exception) {
            // Already unregistered or not registered
        }
    }

    @SuppressLint("MissingPermission")
    private fun updateScanResults() {
        try {
            val results = wifiManager.scanResults
            val ssids = results.map { it.SSID }
                .filter { it.isNotEmpty() }
                .distinct()
            Log.d("WifiHelper", "Found SSIDs: $ssids")
            _scanResults.value = ssids
            if (_status.value.startsWith("Scanning")) {
                _status.value = "Scan Completed"
            }
        } catch (e: Exception) {
            Log.e("WifiHelper", "Error getting scan results", e)
        }
    }

    fun connectToWifi(ssid: String, passphrase: String) {
        _status.value = "Connecting to $ssid..."
        Log.d("WifiHelper", "Connecting to $ssid with passphrase: $passphrase")

        // Release any existing network connection first
        disconnect()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ (API 29+) Connection Flow using WifiNetworkSpecifier
            try {
                val specifier = WifiNetworkSpecifier.Builder()
                    .setSsid(ssid)
                    .setWpa2Passphrase(passphrase)
                    .build()

                val request = NetworkRequest.Builder()
                    .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                    .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) // Ensure local local-only AP is bound
                    .setNetworkSpecifier(specifier)
                    .build()

                val callback = object : ConnectivityManager.NetworkCallback() {
                    override fun onAvailable(network: Network) {
                        super.onAvailable(network)
                        Log.d("WifiHelper", "Connected to local AP: $ssid")
                        
                        // Bind all process requests to this specific network
                        connectivityManager.bindProcessToNetwork(network)
                        
                        _status.value = "Connected to $ssid"
                        
                        // Wait a tiny bit for DHCP to complete, then query local IP
                        _currentIp.value = getLocalIpAddress()
                    }

                    override fun onUnavailable() {
                        super.onUnavailable()
                        Log.e("WifiHelper", "Network unavailable/User cancelled connection request")
                        _status.value = "Connection Failed: Timeout or Cancelled"
                    }

                    override fun onLost(network: Network) {
                        super.onLost(network)
                        Log.w("WifiHelper", "Network connection lost")
                        connectivityManager.bindProcessToNetwork(null)
                        _status.value = "Disconnected"
                        _currentIp.value = null
                    }
                }

                networkCallback = callback
                connectivityManager.requestNetwork(request, callback)

            } catch (e: Exception) {
                Log.e("WifiHelper", "Error initiating connection specifier", e)
                _status.value = "Error: ${e.message}"
            }
        } else {
            // Fallback connection flow for API < 29
            @Suppress("DEPRECATION")
            try {
                val wifiConfig = android.net.wifi.WifiConfiguration().apply {
                    SSID = "\"$ssid\""
                    preSharedKey = "\"$passphrase\""
                }
                val netId = wifiManager.addNetwork(wifiConfig)
                wifiManager.disconnect()
                wifiManager.enableNetwork(netId, true)
                wifiManager.reconnect()
                
                _status.value = "Connecting via Legacy API..."
                _currentIp.value = getLocalIpAddress()
            } catch (e: Exception) {
                Log.e("WifiHelper", "Error in legacy connection", e)
                _status.value = "Error: ${e.message}"
            }
        }
    }

    fun disconnect() {
        Log.d("WifiHelper", "Disconnecting Wi-Fi configuration")
        try {
            connectivityManager.bindProcessToNetwork(null)
            networkCallback?.let {
                connectivityManager.unregisterNetworkCallback(it)
            }
        } catch (e: Exception) {
            // Already unregistered or not connected
        } finally {
            networkCallback = null
            _status.value = "Disconnected"
            _currentIp.value = null
        }
    }

    /**
     * Helper to retrieve current dynamic IPv4 address of wlan0 interface (assigned by DHCP server on RPi).
     */
    fun getLocalIpAddress(): String? {
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                // Filter specifically for wlan0 or local wireless interface
                if (intf.name.lowercase().contains("wlan") || intf.name.lowercase().contains("ap")) {
                    val addrs = Collections.list(intf.inetAddresses)
                    for (addr in addrs) {
                        if (!addr.isLoopbackAddress) {
                            val sAddr = addr.hostAddress ?: continue
                            val isIPv4 = sAddr.indexOf(':') < 0
                            if (isIPv4) {
                                Log.d("WifiHelper", "Found dynamic IP address: $sAddr on interface ${intf.name}")
                                return sAddr
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("WifiHelper", "Error getting local IP address", e)
        }
        return null
    }
}
