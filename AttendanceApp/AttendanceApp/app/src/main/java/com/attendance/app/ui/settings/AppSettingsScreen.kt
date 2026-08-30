package com.attendance.app.ui.settings

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.attendance.app.data.TokenStore
import com.attendance.app.BuildConfig
import com.attendance.app.ui.components.GlassCard
import com.attendance.app.ui.dashboard.DashboardViewModel
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppSettingsScreen(
    onBack: () -> Unit,
    tokenStore: TokenStore,
    wifiHelper: com.attendance.app.hardware.wifi.WifiHelper,
    vm: DashboardViewModel = hiltViewModel()
) {
    val isDark by tokenStore.isDarkMode.collectAsState(initial = true)
    val role by tokenStore.role.collectAsState(initial = "student")
    val state by vm.state.collectAsState()
    val config = state.termConfig
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    // Wi-Fi States
    val wifiStatus by wifiHelper.status.collectAsState()
    val availableWifiNetworks by wifiHelper.scanResults.collectAsState()
    val dynamicIp by wifiHelper.currentIp.collectAsState()
    
    val currentServerIp by tokenStore.serverIp.collectAsState(initial = "192.168.4.1")
    val currentBaseUrl by tokenStore.baseUrl.collectAsState(initial = "http://192.168.4.1/api")

    var selectedSsidForConnection by remember { mutableStateOf<String?>(null) }
    var wifiPasswordInput by remember { mutableStateOf("") }
    var showPasswordDialog by remember { mutableStateOf(false) }

    val logoLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            context.contentResolver.openInputStream(it)?.use { stream ->
                val bytes = stream.readBytes()
                val requestFile = bytes.toRequestBody("image/*".toMediaTypeOrNull())
                val body = MultipartBody.Part.createFormData("logo", "system_logo.png", requestFile)
                vm.uploadSystemLogo(body)
            }
        }
    }

    // Permission launcher to handle location scans
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocation = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocation = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        if (fineLocation || coarseLocation) {
            wifiHelper.startScan()
        }
    }

    // Trigger scanning and handle lifecycle cleanups
    DisposableEffect(Unit) {
        locationPermissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
        onDispose {
            wifiHelper.stopScan()
        }
    }

    // Automatically synchronize server IP when connected to SmartAttendance
    LaunchedEffect(wifiStatus) {
        if (wifiStatus.contains("Connected to SmartAttendance", ignoreCase = true)) {
            // SmartAttendance AP local gateway address is always 192.168.4.1
            tokenStore.setServerIp("192.168.4.1")
        }
    }

    // Custom Connection Password Dialog
    if (showPasswordDialog && selectedSsidForConnection != null) {
        val ssid = selectedSsidForConnection!!
        Dialog(onDismissRequest = { showPasswordDialog = false }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp,
                modifier = Modifier.padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Connect to Network",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = ssid,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.height(16.dp))
                    
                    OutlinedTextField(
                        value = wifiPasswordInput,
                        onValueChange = { wifiPasswordInput = it },
                        label = { Text("Password") },
                        placeholder = { Text("Enter wifi passphrase") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(Modifier.height(20.dp))
                    
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        OutlinedButton(
                            onClick = { showPasswordDialog = false },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Cancel")
                        }
                        Button(
                            onClick = {
                                wifiHelper.connectToWifi(ssid, wifiPasswordInput)
                                showPasswordDialog = false
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Connect")
                        }
                    }
                }
            }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
                title = { Text("App Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    "APPEARANCE",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                    letterSpacing = 2.sp
                )
            }

            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .padding(16.dp)
                            .fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isDark) Icons.Default.DarkMode else Icons.Default.Palette,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(Modifier.width(16.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Appearance Mode",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                if (isDark) "Currently in Dark Mode" else "Currently in Light Mode",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                        Switch(
                            checked = !isDark,
                            onCheckedChange = { scope.launch { tokenStore.setDarkMode(!it) } }
                        )
                    }
                }
            }

            // ─── Network Configuration ────────────────────────────
            item {
                Text(
                    "NETWORK & WI-FI CONFIGURATION",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                    letterSpacing = 2.sp,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }

            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        // Header Status
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = if (wifiStatus.contains("Connected")) Icons.Default.Wifi else Icons.Default.WifiOff,
                                contentDescription = null,
                                tint = if (wifiStatus.contains("Connected")) Color(0xFF22C55E) else MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Wi-Fi Connection Manager", fontWeight = FontWeight.SemiBold)
                                Text(
                                    text = wifiStatus,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                            IconButton(onClick = { wifiHelper.startScan() }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Scan networks")
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        // Connection Details Info
                        dynamicIp?.let { ip ->
                            Text(
                                text = "Client IP: $ip (DHCP Dynamic)",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF22C55E),
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Text(
                            text = "Backend Server: $currentBaseUrl",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )

                        Spacer(Modifier.height(16.dp))

                        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                        Spacer(Modifier.height(12.dp))

                        Text(
                            text = "Available Networks",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )

                        Spacer(Modifier.height(8.dp))

                        if (availableWifiNetworks.isEmpty()) {
                            Text(
                                text = "No networks found. Tap refresh or check location permissions.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                            )
                        } else {
                            availableWifiNetworks.forEach { ssid ->
                                val isSmartAttendance = ssid == "SmartAttendance"
                                Card(
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSmartAttendance) 
                                            MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                        else 
                                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                                    ),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp)
                                        .clickable {
                                            selectedSsidForConnection = ssid
                                            // Prefill password default for SmartAttendance AP
                                            wifiPasswordInput = if (isSmartAttendance) "university-admin" else ""
                                            showPasswordDialog = true
                                        },
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Wifi,
                                            contentDescription = null,
                                            tint = if (isSmartAttendance) Color(0xFF22C55E) else MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Spacer(Modifier.width(12.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(
                                                text = ssid,
                                                fontWeight = if (isSmartAttendance) FontWeight.Bold else FontWeight.Normal,
                                                style = MaterialTheme.typography.bodyMedium
                                            )
                                            if (isSmartAttendance) {
                                                Text(
                                                    text = "Primary Server Access Point",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = Color(0xFF22C55E)
                                                )
                                            }
                                        }
                                        if (isSmartAttendance) {
                                            Icon(
                                                imageVector = Icons.Default.CheckCircle,
                                                contentDescription = "Recommended AP",
                                                tint = Color(0xFF22C55E),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ─── Administrative Section ────────────────────────────
            if (role?.lowercase() in listOf("super_admin", "admin")) {
                item {
                    Text(
                        "ADMINISTRATIVE CONTROLS",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                }

                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text("System Identity", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.height(16.dp))
                            
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                                    modifier = Modifier.size(64.dp)
                                ) {
                                    if (config?.systemLogoUrl != null) {
                                        AsyncImage(
                                            model = config.systemLogoUrl,
                                            contentDescription = null,
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Fit
                                        )
                                    } else {
                                        Icon(Icons.Default.Settings, contentDescription = null, tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
                                    }
                                }
                                Spacer(Modifier.width(16.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("Global Logo", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                    Text("Used across all platforms", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                                }
                                Button(
                                    onClick = { logoLauncher.launch("image/*") },
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    modifier = Modifier.height(32.dp)
                                ) {
                                    Text("Upload", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                            
                            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                            
                            Text("Academic Weights", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            Spacer(Modifier.height(12.dp))
                            
                            AdminWeightRow("Final Exam", config?.examWeight ?: 60.0)
                            AdminWeightRow("Coursework", config?.courseworkWeight ?: 40.0)
                        }
                    }
                }
            }
            
            item {
                Text(
                    "ABOUT",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                    letterSpacing = 2.sp,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }
            
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Version", style = MaterialTheme.typography.bodyMedium)
                            Text("1.0.2 Stable", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Hardware Sync", style = MaterialTheme.typography.bodyMedium)
                            Text("RPi 4 Verified", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF22C55E))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminWeightRow(label: String, weight: Double) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Surface(
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text(
                "${weight.toInt()}%",
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}
