package com.attendance.app.ui.iot

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.model.Student
import com.attendance.app.ui.components.GlassCard
import com.attendance.app.ui.login.GlassTextField

@Composable
fun IoTScreen(
    onBack: () -> Unit,
    vm: IoTViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(modifier = Modifier.fillMaxSize()) {
            com.attendance.app.ui.components.SectionHeader(
                title = "IoT Workshop",
                icon = Icons.Default.Router
            )

            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                // ── Discovery Section ──────────────────────────────────────────
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        if (state.capturedUid == null) {
                            Surface(
                                shape = CircleShape,
                                color = if (state.isScanning) MaterialTheme.colorScheme.primary.copy(alpha = 0.1f) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                                modifier = Modifier.size(100.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    if (state.isScanning) {
                                        CircularProgressIndicator(modifier = Modifier.size(80.dp), color = MaterialTheme.colorScheme.primary, strokeWidth = 2.dp)
                                    }
                                    Icon(
                                        Icons.Default.Sensors,
                                        null,
                                        tint = if (state.isScanning) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                        modifier = Modifier.size(40.dp)
                                    )
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                            Text(
                                if (state.isScanning) "Discovery Active..." else "RFID Discovery Mode",
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                if (state.isScanning) "Tap an RFID card on any active scanner" else "Pulse hardware to capture unknown tags",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(Modifier.height(20.dp))
                            Button(
                                onClick = { vm.startDiscovery() },
                                enabled = !state.isScanning,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Text("CAPTURE NEW TAG")
                            }
                        } else {
                            // TAG CAPTURED STATE
                            Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(8.dp))
                            Text("Tag Captured!", fontWeight = FontWeight.Bold)
                            Text("UID: ${state.capturedUid}", color = Color(0xFF22C55E), style = MaterialTheme.typography.labelMedium)
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = { vm.startDiscovery() },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                            ) {
                                Text("RE-SCAN", color = MaterialTheme.colorScheme.onSurface)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))

                // ── Student Linking Section ─────────────────────────────────────
                Text("Link to Student", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(12.dp))

                GlassTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it; vm.onSearch(it) },
                    label = "Search by ID or Name",
                    icon = Icons.Default.Search
                )

                Spacer(Modifier.height(12.dp))

                LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.filteredStudents.take(5)) { student ->
                        val isSelected = state.selectedStudent?.id == student.id
                        GlassCard(
                            modifier = Modifier.fillMaxWidth().clickable { vm.selectStudent(student) },
                            containerColor = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.1f) else null
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(imageVector = Icons.Default.Person, contentDescription = null, tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(student.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                    Text("ID: ${student.universityId ?: "N/A"}", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), style = MaterialTheme.typography.labelSmall)
                                }
                                if (isSelected) {
                                    Spacer(Modifier.weight(1f))
                                    Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // ── Action Button ──────────────────────────────────────────────
                val canLink = state.capturedUid != null && state.selectedStudent != null
                Button(
                    onClick = { vm.mapTag() },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    enabled = canLink && !state.isLoading,
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (canLink) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)
                    )
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Text("LINK TAG TO STUDENT", fontWeight = FontWeight.Bold, color = if (canLink) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                    }
                }
            }
        }
    }
}


