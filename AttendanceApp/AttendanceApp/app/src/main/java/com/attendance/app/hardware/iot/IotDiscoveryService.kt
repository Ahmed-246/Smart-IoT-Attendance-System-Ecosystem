package com.attendance.app.hardware.iot

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

data class IotDevice(
    val id: String,
    val name: String,
    val ipAddress: String,
    val macAddress: String,
    val isProvisioned: Boolean
)

/**
 * Service to discover unprovisioned or active ESP32 Attendance Scanners
 * on the local 'SmartAttendance' network using mDNS (Network Service Discovery).
 */
@Singleton
class IotDiscoveryService @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val SERVICE_TYPE = "_http._tcp." // Assuming ESP32 broadcasts a standard HTTP service
    private val SERVICE_NAME_PREFIX = "ESP32-Attendance"

    private val _discoveredDevices = MutableStateFlow<List<IotDevice>>(emptyList())
    val discoveredDevices: StateFlow<List<IotDevice>> = _discoveredDevices

    private var discoveryListener: NsdManager.DiscoveryListener? = null

    fun startDiscovery() {
        if (discoveryListener != null) return

        _discoveredDevices.value = emptyList() // Clear previous

        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(regType: String) {
                Log.d("IoTDiscovery", "Service discovery started")
            }

            override fun onServiceFound(service: NsdServiceInfo) {
                Log.d("IoTDiscovery", "Service found: ${service.serviceName}")
                if (service.serviceName.contains(SERVICE_NAME_PREFIX)) {
                    nsdManager.resolveService(service, object : NsdManager.ResolveListener {
                        override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                            Log.e("IoTDiscovery", "Resolve failed: $errorCode")
                        }

                        override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                            Log.d("IoTDiscovery", "Resolve Succeeded. IP: ${serviceInfo.host.hostAddress}")
                            
                            val newDevice = IotDevice(
                                id = "esp_${serviceInfo.host.hostAddress.replace(".", "")}",
                                name = serviceInfo.serviceName,
                                ipAddress = serviceInfo.host.hostAddress ?: "Unknown",
                                macAddress = "Pending...", // Would be fetched via a direct REST call to the ESP32
                                isProvisioned = false
                            )
                            
                            _discoveredDevices.update { current ->
                                if (current.none { it.ipAddress == newDevice.ipAddress }) {
                                    current + newDevice
                                } else current
                            }
                        }
                    })
                }
            }

            override fun onServiceLost(service: NsdServiceInfo) {
                Log.e("IoTDiscovery", "service lost: $service")
                _discoveredDevices.update { current ->
                    current.filterNot { it.name == service.serviceName }
                }
            }

            override fun onDiscoveryStopped(serviceType: String) {
                Log.i("IoTDiscovery", "Discovery stopped: $serviceType")
            }

            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                Log.e("IoTDiscovery", "Discovery failed: Error code:$errorCode")
                nsdManager.stopServiceDiscovery(this)
            }

            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                Log.e("IoTDiscovery", "Discovery failed: Error code:$errorCode")
                nsdManager.stopServiceDiscovery(this)
            }
        }

        nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
    }

    fun stopDiscovery() {
        discoveryListener?.let {
            try {
                nsdManager.stopServiceDiscovery(it)
            } catch (e: Exception) {
                Log.e("IoTDiscovery", "Error stopping discovery", e)
            }
        }
        discoveryListener = null
    }
}
