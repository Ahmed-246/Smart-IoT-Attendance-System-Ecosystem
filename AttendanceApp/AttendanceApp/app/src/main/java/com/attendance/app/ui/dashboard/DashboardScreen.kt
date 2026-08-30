package com.attendance.app.ui.dashboard

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.rememberAsyncImagePainter
import com.attendance.app.model.ActivityFeedItem
import com.attendance.app.model.GlobalStats
import com.attendance.app.model.Session
import com.attendance.app.model.StudentGradeSummary
import com.attendance.app.model.MonitoringSummary
import com.attendance.app.ui.components.GlassCard
import com.attendance.app.ui.components.SectionHeader
import com.attendance.app.ui.components.ActivityFeedCard
import com.attendance.app.ui.components.AriaGlowButton
import com.attendance.app.ui.components.IoTDiscoverySignal

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateAttendance: (Int) -> Unit,
    onNavigateSessions: () -> Unit,
    onNavigateChatbot: () -> Unit,
    onNavigateAssessments: () -> Unit,
    onNavigatePerformance: () -> Unit,
    onNavigateProfile: () -> Unit,
    onNavigateApprovals: () -> Unit,
    onNavigateIoT: () -> Unit,
    onNavigateMobileScanner: () -> Unit,
    onNavigateSessionReport: (Int) -> Unit,
    onNavigateSettings: () -> Unit,
    onNavigateHierarchy: () -> Unit,
    onNavigateManagement: () -> Unit,
    onNavigateMonitoring: () -> Unit,
    vm: DashboardViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    val isSuperAdmin = state.role.lowercase() == "super_admin"
    val isAdmin      = state.role.lowercase() == "admin"
    val isStaff      = state.role.lowercase() in listOf("super_admin", "admin", "doctor", "engineer")

    // Only show full screen loader if we have no critical data yet AND no error
    val hasNoData = state.activeSessions.isEmpty() && state.globalStats == null && state.studentAttendance.isEmpty()
    
    if (state.isLoading && hasNoData && state.error == null) {
        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary, strokeWidth = 3.dp)
                Spacer(Modifier.height(16.dp))
                Text("Initializing System...", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
            // ── Error State ──────────────────────────────────────────────
            if (state.error != null) {
                item {
                    GlassCard(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.1f)
                    ) {
                        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(imageVector = Icons.Default.CloudOff, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Spacer(Modifier.height(8.dp))
                            Text(state.error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                            Spacer(Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { vm.loadData() },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                                ) {
                                    Text("Retry")
                                }
                                OutlinedButton(onClick = onNavigateSettings) {
                                    Text("Check IP Settings")
                                }
                            }
                        }
                    }
                }
            }
            // ── Header ─────────────────────────────────────────────────────
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (isSuperAdmin) "Command Center" else "Welcome Back,",
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.onBackground,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            if (isSuperAdmin) "System Health & Global Operations" else if (state.name.isNotEmpty()) state.name else state.email,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
                        )
                    }
                    
                    // Profile Image & Badge
                    Column(horizontalAlignment = Alignment.End) {
                        val painter = rememberAsyncImagePainter(
                            model = state.profileImage ?: "https://ui-avatars.com/api/?name=${state.name.replace(" ", "+")}&background=random"
                        )
                        Box {
                            Image(
                                painter = painter,
                                contentDescription = "Profile",
                                modifier = Modifier
                                    .size(52.dp)
                                    .clip(CircleShape)
                                    .border(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), CircleShape)
                                    .clickable { onNavigateProfile() },
                                contentScale = ContentScale.Crop
                            )
                            // Role Badge overlay
                            Surface(
                                color = MaterialTheme.colorScheme.primary,
                                shape = RoundedCornerShape(4.dp),
                                modifier = Modifier.align(Alignment.BottomCenter).offset(y = 6.dp)
                            ) {
                                Text(
                                    state.role.uppercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontSize = 8.sp,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            // ── Super Admin Command Center Row (NEW) ────────────────────────
            if (isSuperAdmin && state.globalStats != null) {
                item {
                    CommandStatsSection(state.globalStats!!)
                }
                
                item {
                    SystemHierarchySection(state.globalStats!!, onNavigateHierarchy)
                }
            }

            // ── Student KPI Section (NEW) ──────────────────────────────────
            if (state.role.lowercase() == "student") {
                if (state.studentAttendance.isNotEmpty()) {
                    item {
                        StudentKPISection(
                            attendanceRecords = state.studentAttendance,
                            onNavigateAttendance = { onNavigateAttendance(state.userId) }
                        )
                    }
                }

                // ── Performance Trends (NEW) ──
                item {
                    PerformanceTrendSection(
                        attendanceTrend = state.attendanceTrend,
                        gradeTrend = state.gradeTrend
                    )
                }
                
                if (state.studentGrades != null) {
                    item {
                        GradeSummarySection(state.studentGrades!!)
                    }
                }
            }

            // ── Administrative Management (NEW Hub) ────────────────────────
            if (isAdmin || isSuperAdmin) {
                item {
                    SectionHeader("Administrative Center", icon = Icons.Default.Settings)
                    ManagementHubCard(onNavigateManagement)
                }
            }

            // ── System Health & IoT Status (NEW) ────────────────────────────────────────
            if (isStaff) {
                item {
                    SectionHeader("System Infrastructure", icon = Icons.Default.Router)
                    
                    // REAL-TIME IoT SIGNAL (Premium Feature)
                    if (state.monitoringSummary?.critical24h ?: 0 > 0) {
                        IoTDiscoverySignal(
                            deviceName = "ESP32-Gateway-Node #4", 
                            onDismiss = { /* Action */ }
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        // Backend Health
                        HealthSmallCard(
                            label = "Server",
                            value = if (state.error == null) "Online" else "Error",
                            icon = Icons.Default.Dns,
                            color = if (state.error == null) Color(0xFF10B981) else Color(0xFFEF4444),
                            modifier = Modifier.weight(1f)
                        )
                        // IoT Gateway (ESP32)
                        HealthSmallCard(
                            label = "IoT Hub",
                            value = if (state.monitoringSummary?.activeSessions ?: 0 > 0) "Active" else "Standby",
                            icon = Icons.Default.DeveloperBoard,
                            color = Color(0xFF3B82F6),
                            modifier = Modifier.weight(1f)
                        )
                        // Database
                        HealthSmallCard(
                            label = "Database",
                            value = "Healthy",
                            icon = Icons.Default.Storage,
                            color = Color(0xFF8B5CF6),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // ── Premium AI Assistant (NEW Glow Experience) ─────────────────────────────
            item {
                Text("AI Intelligence", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(12.dp))
                AriaGlowButton(
                    text = "Ask ARIA Assistant",
                    icon = Icons.Default.AutoAwesome,
                    onClick = onNavigateChatbot,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // ── Quick Actions (Everyone) ─────────────────────────────
            item {
                Text("Quick Access", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(12.dp))
                QuickActionGrid(
                    onNavigateSessions = onNavigateSessions,
                    onNavigateAssessments = onNavigateAssessments,
                    onNavigatePerformance = onNavigatePerformance,
                    onNavigateChatbot = onNavigateChatbot,
                    onNavigateApprovals = onNavigateApprovals,
                    onNavigateIoT = onNavigateIoT,
                    onNavigateMobileScanner = onNavigateMobileScanner,
                    onNavigateSettings = onNavigateSettings,
                    role = state.role
                )
            }

            // ── Global Activity Feed (Super Admin Only) ────────────────────
            if (isSuperAdmin && state.activityFeed.isNotEmpty()) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.RssFeed, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Global Activity", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.SemiBold)
                    }
                }
                items(state.activityFeed) { activity ->
                    ActivityFeedCard(activity)
                }
            }

            // ── Active Sessions (Everyone else) ────────────────────────────
            if (!isSuperAdmin) {
                item {
                    Text(
                        if (state.role == "student") "Your Active Sessions" else "Active Sessions",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                if (state.activeSessions.isEmpty()) {
                    item { EmptySessionsPlaceholder() }
                } else {
                    items(state.activeSessions) { session ->
                        SessionCard(
                            session = session,
                            courseName = state.courses.find { it.id == session.courseId }?.name ?: "Course #${session.courseId}",
                            onViewDetails = {
                                if (isStaff) onNavigateSessionReport(session.id)
                                else onNavigateAttendance(state.userId)
                            },
                            onClose = if (isAdmin || state.role == "engineer") { { vm.closeSession(session.id) } } else null
                        )
                    }
                }
            }
            
        item { Spacer(Modifier.height(80.dp)) }
    }
}

// ── New Command Center Components ──────────────────────────────────────────

@Composable
fun CommandStatsSection(stats: GlobalStats) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Total Students Large
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Total Students Enrolled", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    Text("${stats.totalStudents}", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                    Text("↗ +${stats.studentTrend}% this semester", color = Color(0xFF22C55E), style = MaterialTheme.typography.labelSmall)
                }
                Icon(imageVector = Icons.Default.Groups, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f), modifier = Modifier.size(48.dp))
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            GlassCard(modifier = Modifier.weight(1f)) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Active Scanners", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                        Spacer(Modifier.weight(1f))
                        Icon(imageVector = Icons.Default.TapAndPlay, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(14.dp))
                    }
                    Text("${stats.activeScanners}/${stats.totalScanners}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                    Text("${stats.uptimePct}% Network Uptime", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                }
            }
            GlassCard(modifier = Modifier.weight(1f)) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Alerts & Anomalies", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                        Spacer(Modifier.weight(1f))
                        Icon(imageVector = Icons.Default.Warning, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(14.dp))
                    }
                    Text("${stats.alertsCount}", style = MaterialTheme.typography.titleLarge, color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                    Text("Devices Offline", style = MaterialTheme.typography.labelSmall, color = Color(0xFFEF4444).copy(alpha = 0.7f))
                }
            }
        }
    }
}

@Composable
fun SystemHierarchySection(stats: GlobalStats, onNavigateHierarchy: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.Default.Schema, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("System Hierarchy", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.weight(1f))
                Text("View All", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.clickable { onNavigateHierarchy() })
            }
            Spacer(Modifier.height(16.dp))
            HierarchyItem(icon = Icons.Default.Business, label = "Faculties", sub = "${stats.totalFaculties} Managed", onClick = onNavigateHierarchy)
            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f), modifier = Modifier.padding(vertical = 12.dp))
            HierarchyItem(icon = Icons.Default.AccountTree, label = "Departments", sub = "${stats.totalDepartments} Divisions", onClick = onNavigateHierarchy)
            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f), modifier = Modifier.padding(vertical = 12.dp))
            HierarchyItem(icon = Icons.Default.AutoStories, label = "Courses", sub = "${stats.totalCourses} Active", onClick = onNavigateHierarchy)
        }
    }
}

@Composable
fun HierarchyItem(icon: ImageVector, label: String, sub: String, onClick: () -> Unit = {}) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().clickable { onClick() }
    ) {
        Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f), modifier = Modifier.size(40.dp)) {
            Box(contentAlignment = Alignment.Center) { Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(20.dp)) }
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
            Text(sub, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
        }
        Spacer(Modifier.weight(1f))
        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowForwardIos, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f), modifier = Modifier.size(12.dp))
    }
}


@Composable
fun QuickActionGrid(
    onNavigateSessions: () -> Unit,
    onNavigateAssessments: () -> Unit,
    onNavigatePerformance: () -> Unit,
    onNavigateChatbot: () -> Unit,
    onNavigateApprovals: () -> Unit,
    onNavigateIoT: () -> Unit,
    onNavigateMobileScanner: () -> Unit,
    onNavigateSettings: () -> Unit,
    role: String
) {
    val isSuperAdmin = role.lowercase() == "super_admin"
    val isEngineer   = role.lowercase() == "engineer"
    val isAdmin      = role.lowercase() == "admin"
    val isStaff      = role.lowercase() in listOf("super_admin", "admin", "doctor", "engineer")

    val items = mutableListOf(
        Triple("All Sessions", Icons.Default.CalendarToday, onNavigateSessions)
    )

    if (isStaff) {
        items.add(0, Triple("Assessments", Icons.AutoMirrored.Filled.Assignment, onNavigateAssessments))
    } else {
        // Students also need quick access to these
        items.add(Triple("Performance", Icons.Default.TrendingUp, onNavigatePerformance))
    }
    
    if (isSuperAdmin || isAdmin) {
        items.add(Triple("Requested", Icons.Default.Groups, onNavigateApprovals))
        items.add(Triple("Mobile Scanner", Icons.Default.Nfc, onNavigateMobileScanner))
    }
    
    if (isSuperAdmin || isEngineer) {
        items.add(Triple("Map Device", Icons.Default.TapAndPlay, onNavigateIoT))
    }
    
    if (isSuperAdmin) {
        items.add(Triple("Settings", Icons.Default.Settings, onNavigateSettings))
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier.height(
            if (items.size > 4) 250.dp else if (items.size > 2) 160.dp else 80.dp
        ),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(items) { (label, icon, action) ->
            GlassCard(modifier = Modifier.fillMaxSize().clickable { action() }) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        }
    }
}

// ── Helper Components ──────────────────────────────────────────────────────

@Composable
fun SessionCard(
    session: Session,
    courseName: String,
    onViewDetails: () -> Unit,
    onClose: (() -> Unit)?
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable { onViewDetails() }) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), modifier = Modifier.size(48.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(courseName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Text("Session #${session.id} · Active", style = MaterialTheme.typography.labelSmall, color = Color(0xFF22C55E))
            }
            if (onClose != null) {
                IconButton(onClick = onClose) { Icon(imageVector = Icons.Default.Stop, contentDescription = null, tint = Color(0xFFEF4444)) }
            }
        }
    }
}

@Composable
fun EmptySessionsPlaceholder() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(imageVector = Icons.Default.EventBusy, contentDescription = null, modifier = Modifier.size(36.dp), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
            Text("No active sessions", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun StudentKPISection(
    attendanceRecords: List<com.attendance.app.model.AttendanceRecord>,
    onNavigateAttendance: () -> Unit
) {
    val totalSessions = attendanceRecords.size
    val presentCount = attendanceRecords.count { it.status.lowercase() == "present" }
    val lateCount = attendanceRecords.count { it.status.lowercase() == "late" }
    
    // We treat late as present for simple calculation or partial. Let's just do present/total
    val rate = if (totalSessions > 0) ((presentCount + lateCount).toFloat() / totalSessions.toFloat()) * 100f else 100f
    
    GlassCard(modifier = Modifier.fillMaxWidth().clickable { onNavigateAttendance() }) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(12.dp))
                Text("Your Live Attendance", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Text("${rate.toInt()}%", style = MaterialTheme.typography.headlineSmall, color = if (rate >= 75f) Color(0xFF22C55E) else Color(0xFFEF4444), fontWeight = FontWeight.Black)
            }
            
            Spacer(Modifier.height(16.dp))
            
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Attended", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    Text("$presentCount / $totalSessions", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                }
                
                Column(horizontalAlignment = Alignment.End) {
                    Text("Late", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    Text("$lateCount", style = MaterialTheme.typography.bodyLarge, color = Color(0xFFF59E0B), fontWeight = FontWeight.SemiBold)
                }
            }
            
            Spacer(Modifier.height(16.dp))
            LinearProgressIndicator(
                progress = { rate / 100f },
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(androidx.compose.foundation.shape.RoundedCornerShape(4.dp)),
                trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                color = if (rate >= 75f) Color(0xFF22C55E) else Color(0xFFEF4444)
            )
        }
    }
}

@Composable
fun GradeSummarySection(grades: StudentGradeSummary) {
    val accentColor = if (grades.status.lowercase() == "passed") Color(0xFF22C55E) else Color(0xFFEF4444)
    
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.Default.WorkspacePremium, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(12.dp))
                Text("Academic Standing", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = accentColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        grades.status.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = accentColor,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            
            Spacer(Modifier.height(16.dp))
            
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Overall Average", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    Text("${grades.finalGradePercentage}%", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Black)
                }
                
                Column(horizontalAlignment = Alignment.End) {
                    Text("Failing Subjects", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    Text("${grades.failedSubjectCount}", style = MaterialTheme.typography.bodyLarge, color = if (grades.failedSubjectCount > 0) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                }
            }
            
            if (grades.atRisk) {
                Spacer(Modifier.height(12.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFEF4444).copy(alpha = 0.1f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.PriorityHigh, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("AT RISK: High subject failure count", style = MaterialTheme.typography.labelSmall, color = Color(0xFFEF4444))
                    }
                }
            }
        }
    }
}

@Composable
fun ManagementHubCard(onClick: () -> Unit) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF3B82F6).copy(alpha = 0.1f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = Icons.Default.AdminPanelSettings, contentDescription = null, tint = Color(0xFF3B82F6), modifier = Modifier.size(24.dp))
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text("Management Hub", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                Text("Manage Users, Hierarchy & Course Registry", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            }
            Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
        }
    }
}

@Composable
fun SystemHealthSection(summary: MonitoringSummary, onNavigate: () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth().clickable { onNavigate() }) {
        HealthSmallCard(
            label = "Critical",
            value = summary.critical24h.toString(),
            icon = Icons.Default.Error,
            color = Color(0xFFEF4444),
            modifier = Modifier.weight(1f)
        )
        HealthSmallCard(
            label = "Warnings",
            value = summary.warnings24h.toString(),
            icon = Icons.Default.Warning,
            color = Color(0xFFF59E0B),
            modifier = Modifier.weight(1f)
        )
        HealthSmallCard(
            label = "Active Sessions",
            value = summary.activeSessions.toString(),
            icon = Icons.Default.Sync,
            color = Color(0xFF10B981),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun HealthSmallCard(
    label: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    GlassCard(modifier = modifier) {
        Column(
            Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = color)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), maxLines = 1)
        }
    }
}

@Composable
fun PerformanceTrendSection(
    attendanceTrend: List<Float>,
    gradeTrend: List<Float>
) {
    var selectedTab by remember { mutableStateOf(0) } // 0: Attendance, 1: Grades
    
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Performance Trends", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                
                // Mini Toggle
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                    modifier = Modifier.height(32.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(2.dp)) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (selectedTab == 0) MaterialTheme.colorScheme.primary else Color.Transparent)
                                .clickable { selectedTab = 0 }
                                .padding(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Text("ATT", style = MaterialTheme.typography.labelSmall, color = if (selectedTab == 0) Color.White else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), fontWeight = FontWeight.Bold)
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (selectedTab == 1) Color(0xFF8B5CF6) else Color.Transparent)
                                .clickable { selectedTab = 1 }
                                .padding(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Text("GRD", style = MaterialTheme.typography.labelSmall, color = if (selectedTab == 1) Color.White else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            
            Spacer(Modifier.height(16.dp))
            
            val currentData = if (selectedTab == 0) attendanceTrend else gradeTrend
            val chartColor = if (selectedTab == 0) MaterialTheme.colorScheme.primary else Color(0xFF8B5CF6)
            
            if (currentData.isNotEmpty()) {
                com.attendance.app.ui.components.TrendChart(
                    data = currentData,
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    lineColor = chartColor
                )
            } else {
                Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                    Text("Calculating analysis...", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
                }
            }
            
            Spacer(Modifier.height(12.dp))
            Text(
                if (selectedTab == 0) "Linear analysis of your last 10 session attendances" else "Tracking your latest assessment grade trajectory",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
            )
        }
    }
}
