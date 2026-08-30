package com.attendance.app.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.components.GlassCard
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SystemSettingsScreen(
    onBack: () -> Unit,
    vm: SystemSettingsViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    val context = LocalContext.current

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri -> vm.onLogoSelected(uri) }

    Scaffold(
        containerColor = Color(0xFF070707),
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
                title = { Text("System Configuration", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.White) }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            
            if (state.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Color(0xFF3B82F6))
            }

            state.successMessage?.let {
                Surface(color = Color(0xFF22C55E).copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(it, color = Color(0xFF22C55E), modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.labelMedium)
                }
            }

            state.errorMessage?.let {
                Surface(color = Color(0xFFEF4444).copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(it, color = Color(0xFFEF4444), modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.labelMedium)
                }
            }

            // Graphic Customization
            Text("Branding & Graphics", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.SemiBold)
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Upload a new university logo to update the system globally. This changes the portal and mobile app presentation.", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.6f))
                    
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color.White.copy(alpha = 0.05f),
                        modifier = Modifier.fillMaxWidth().height(100.dp).clickable { galleryLauncher.launch("image/*") },
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (state.logoUri != null) Color(0xFF22C55E) else Color.White.copy(alpha = 0.1f))
                    ) {
                        Row(modifier = Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = Icons.Default.CameraAlt, contentDescription = null, tint = if (state.logoUri != null) Color(0xFF22C55E) else Color.White)
                            Spacer(Modifier.width(16.dp))
                            Column {
                                Text("Upload Global Logo", color = Color.White, fontWeight = FontWeight.Bold)
                                Text(if (state.logoUri != null) "New Image Selected" else "Tap here to browse", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // Academic Grading Configuration
            Text("Global Academic Constants", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.SemiBold)
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Define global grading distribution. Modifying this forces a database recalculation globally.", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.6f))
                    
                    val examVal = state.examWeight.toFloatOrNull() ?: 60f
                    val courseVal = state.courseworkWeight.toFloatOrNull() ?: 40f

                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text("Final Exam Weight", color = Color.White, style = MaterialTheme.typography.labelMedium)
                            Text("${examVal.roundToInt()}%", color = Color(0xFF8B5CF6), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Coursework Weight", color = Color.White, style = MaterialTheme.typography.labelMedium)
                            Text("${courseVal.roundToInt()}%", color = Color(0xFF3B82F6), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                        }
                    }

                    Slider(
                        value = examVal,
                        onValueChange = { newVal ->
                            val cw = 100f - newVal
                            vm.onWeightsChanged(newVal.roundToInt().toString(), cw.roundToInt().toString())
                        },
                        valueRange = 0f..100f,
                        steps = 99,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFF8B5CF6),
                            activeTrackColor = Color(0xFF8B5CF6),
                            inactiveTrackColor = Color(0xFF3B82F6)
                        )
                    )
                }
            }

            Spacer(Modifier.weight(1f))

            Button(
                onClick = { vm.saveConfig(context) },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = !state.isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
            ) {
                Icon(imageVector = Icons.Default.Save, contentDescription = null, tint = Color.White)
                Spacer(Modifier.width(8.dp))
                Text("PERSIST CHANGES", style = MaterialTheme.typography.labelLarge, color = Color.White, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
