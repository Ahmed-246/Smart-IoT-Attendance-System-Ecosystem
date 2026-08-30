package com.attendance.app.ui.session

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.components.GlassCard
import com.attendance.app.ui.login.GlassTextField

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionReportScreen(
    onBack: () -> Unit,
    vm: SessionReportViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }

    Scaffold(
        containerColor = Color(0xFF070707),
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
                title = { Text("Session Audit", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.White) } },
                actions = { IconButton(onClick = vm::load) { Icon(imageVector = Icons.Default.Refresh, contentDescription = null, tint = Color.White) } }
            )
        }
    ) { padding ->
        val report = state.report
        
        if (state.isLoading && report == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF3B82F6))
            }
        } else if (report != null) {
            Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
                
                // ── Summary Metrics ──────────────────────────────────────────
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatBox(Modifier.weight(1f), "Present", "${report.present}", Color(0xFF22C55E))
                    StatBox(Modifier.weight(1f), "Absent", "${report.absent}", Color(0xFFEF4444))
                    StatBox(Modifier.weight(1f), "Efficiency", "${report.attendanceRate}%", Color(0xFF3B82F6))
                }

                Spacer(Modifier.height(24.dp))

                // ── Search & Filter ──────────────────────────────────────────
                Text("Attendee Records", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(12.dp))
                
                com.attendance.app.ui.login.GlassTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    label = "Search Name or ID",
                    icon = Icons.Default.Search
                )

                Spacer(Modifier.height(16.dp))

                val filtered = report.records.filter { 
                    it.studentName.contains(searchQuery, ignoreCase = true) || 
                    it.universityId?.contains(searchQuery) == true 
                }

                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.weight(1f)) {
                    items(filtered) { record ->
                        AttendeeCard(
                            name = record.studentName, 
                            id = record.universityId ?: "N/A", 
                            status = record.status, 
                            timestamp = record.timestamp
                        )
                    }
                }
            }
        } else if (state.error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(imageVector = Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("Session report unavailable", color = Color.White.copy(alpha = 0.5f))
                }
            }
        }
    }
}

@Composable
fun AttendeeCard(name: String, id: String, status: String, timestamp: String?) {
    val isPresent = status == "present"
    val statusColor = if (isPresent) Color(0xFF22C55E) else Color(0xFFEF4444)
    
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.05f), modifier = Modifier.size(40.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text(name.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(name, style = MaterialTheme.typography.bodyMedium, color = Color.White, fontWeight = FontWeight.SemiBold)
                Text("ID: $id", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.4f))
                if (isPresent && timestamp != null) {
                    Text("Time: ${timestamp.take(16).replace("T", " ")}", style = MaterialTheme.typography.labelSmall, color = Color(0xFF3B82F6), fontWeight = FontWeight.SemiBold)
                }
            }
            
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = statusColor.copy(alpha = 0.1f)
            ) {
                Text(
                    status.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = statusColor,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    fontSize = 9.sp
                )
            }
        }
    }
}

@Composable
fun StatBox(modifier: Modifier = Modifier, label: String, value: String, color: Color) {
    GlassCard(modifier = modifier) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, style = MaterialTheme.typography.titleMedium, color = color, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.4f))
        }
    }
}
