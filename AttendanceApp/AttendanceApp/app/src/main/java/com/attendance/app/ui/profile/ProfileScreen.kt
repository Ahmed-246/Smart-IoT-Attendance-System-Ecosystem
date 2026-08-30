package com.attendance.app.ui.profile

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.attendance.app.ui.components.GlassCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit,
    onNavigatePerformance: () -> Unit,
    vm: ProfileViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    val context = LocalContext.current

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            vm.onProfileImageSelected(context, uri)
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
                title = { Text("Identity Hub", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            // ── Hero Section (Website-like Cover) ──────────────────
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(260.dp)
                        .padding(top = 12.dp),
                    contentAlignment = Alignment.TopCenter
                ) {
                    // Cover Gradient Background
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .clip(RoundedCornerShape(24.dp))
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        MaterialTheme.colorScheme.primary,
                                        MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                                    )
                                )
                            )
                    )

                    Column(
                        modifier = Modifier.padding(top = 60.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(contentAlignment = Alignment.BottomEnd) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.surface,
                                modifier = Modifier
                                    .size(140.dp)
                                    .border(4.dp, MaterialTheme.colorScheme.background, CircleShape)
                                    .clickable { galleryLauncher.launch("image/*") }
                            ) {
                                if (state.profileImageUrl.isNotEmpty()) {
                                    AsyncImage(
                                        model = state.profileImageUrl,
                                        contentDescription = "Profile Image",
                                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.Person,
                                        contentDescription = null,
                                        modifier = Modifier.padding(32.dp),
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                            // Active Status Badge
                            Surface(
                                shape = CircleShape,
                                color = Color(0xFF22C55E),
                                modifier = Modifier
                                    .size(32.dp)
                                    .border(4.dp, MaterialTheme.colorScheme.background, CircleShape)
                            ) {}
                        }

                        Spacer(Modifier.height(12.dp))
                        
                        val displayName = remember(state.name, state.role, state.doctorProfile, state.instructorProfile) {
                            val roleLower = state.role.lowercase()
                            val docProfile = state.doctorProfile
                            val instProfile = state.instructorProfile
                            if (roleLower == "doctor" && docProfile != null) {
                                val title = docProfile.doctor.title ?: "Dr."
                                "$title ${docProfile.doctor.name}"
                            } else if ((roleLower == "engineer" || roleLower == "instructor") && instProfile != null) {
                                val title = instProfile.instructor.title ?: "Eng."
                                "$title ${instProfile.instructor.name}"
                            } else if (state.name.isNotEmpty()) {
                                state.name
                            } else {
                                state.email.split("@")[0]
                            }
                        }
                        Text(
                            text = displayName,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.onBackground
                        )

                        val specialization = remember(state.role, state.doctorProfile, state.instructorProfile) {
                            val roleLower = state.role.lowercase()
                            if (roleLower == "doctor") {
                                state.doctorProfile?.doctor?.specialization
                            } else if (roleLower == "engineer" || roleLower == "instructor") {
                                state.instructorProfile?.instructor?.specialization
                            } else {
                                null
                            }
                        }
                        if (!specialization.isNullOrEmpty()) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center,
                                modifier = Modifier.padding(top = 4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Verified,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = specialization,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                        
                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                            shape = RoundedCornerShape(100.dp),
                            modifier = Modifier.padding(top = 4.dp)
                        ) {
                            Text(
                                text = state.role.uppercase(),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                letterSpacing = 1.sp
                            )
                        }
                    }
                }
            }

            // ── Activity Stats (Bento Grid Style) ──────────────────
            if (state.role.lowercase() == "student") {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        StatCard(
                            label = "Attendance",
                            value = "${state.attendanceRate.toInt()}%",
                            icon = Icons.Default.TrendingUp,
                            modifier = Modifier.weight(1f),
                            color = if (state.attendanceRate >= 75) Color(0xFF22C55E) else Color(0xFFEF4444)
                        )
                        StatCard(
                            label = "Total Sessions",
                            value = "${state.totalSessions}",
                            icon = Icons.Default.CalendarMonth,
                            modifier = Modifier.weight(1f),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            } else if (state.role.lowercase() in listOf("super_admin", "admin")) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth().height(100.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            StatCard(
                                label = "Students",
                                value = "${state.globalStats?.totalStudents ?: 0}",
                                icon = Icons.Default.Groups,
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.primary
                            )
                            StatCard(
                                label = "Uptime",
                                value = "${state.globalStats?.uptimePct?.toInt() ?: 0}%",
                                icon = Icons.Default.Bolt,
                                modifier = Modifier.weight(1f),
                                color = Color(0xFF22C55E)
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth().height(100.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            StatCard(
                                label = "Scanners",
                                value = "${state.globalStats?.activeScanners ?: 0}",
                                icon = Icons.Default.Nfc,
                                modifier = Modifier.weight(1f),
                                color = Color(0xFFF59E0B)
                            )
                            StatCard(
                                label = "Alerts",
                                value = "${state.globalStats?.alertsCount ?: 0}",
                                icon = Icons.Default.Warning,
                                modifier = Modifier.weight(1f),
                                color = if ((state.globalStats?.alertsCount ?: 0) > 0) Color(0xFFEF4444) else MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                }
            }

            // ── Info Bento Section ───────────────────────────────
            item {
                Text(
                    "ACCOUNT IDENTITY",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                    letterSpacing = 2.sp
                )
            }

            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        InfoRow(Icons.Default.Badge, "Internal ID", state.universityId)
                        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                        
                        InfoRow(Icons.Default.School, "Department", state.departmentName)
                        HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                        
                        InfoRow(Icons.Default.Email, "Email Address", state.email)
                        
                        if (state.phoneNumber.isNotEmpty() && state.phoneNumber != "N/A") {
                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                            InfoRow(Icons.Default.Phone, "Phone Number", state.phoneNumber)
                        }
                    }
                }
            }

            val role = state.role.lowercase()
            if (role == "doctor" || role == "engineer" || role == "instructor") {
                val bio = if (role == "doctor") state.doctorProfile?.doctor?.bio else state.instructorProfile?.instructor?.bio
                val officeHours = if (role == "doctor") state.doctorProfile?.doctor?.officeHours else state.instructorProfile?.instructor?.officeHours
                val assignedCourses = if (role == "doctor") state.doctorProfile?.assignedCourses else state.instructorProfile?.assignedCourses
                val faculties = if (role == "doctor") state.doctorProfile?.doctor?.faculties else state.instructorProfile?.instructor?.faculties
                val departments = if (role == "doctor") state.doctorProfile?.doctor?.departments else state.instructorProfile?.instructor?.departments
                val appointmentLink = if (role == "doctor") state.doctorProfile?.doctor?.appointmentLink else state.instructorProfile?.instructor?.appointmentLink
                val capabilities = if (role == "doctor") state.doctorProfile?.doctor?.capabilities else state.instructorProfile?.instructor?.capabilities

                item {
                    Text(
                        "PROFESSIONAL BIOGRAPHY",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(20.dp)) {
                            Text(
                                text = bio ?: "No biography available.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                            )
                        }
                    }
                }

                item {
                    Text(
                        "CLINIC / OFFICE HOURS",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(20.dp)) {
                            Text(
                                text = officeHours ?: "No standard contact hours specified for this term.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                            )
                        }
                    }
                }

                if (!appointmentLink.isNullOrEmpty()) {
                    item {
                        val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current
                        Button(
                            onClick = {
                                try {
                                    uriHandler.openUri(appointmentLink)
                                } catch (e: Exception) {
                                    e.printStackTrace()
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(Icons.Default.CalendarMonth, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Book Clinic Hour", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                item {
                    Text(
                        "ASSOCIATIONS",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            InfoRow(Icons.Default.School, "Faculties", faculties?.joinToString(", ") { it.name } ?: "No designated faculty")
                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                            InfoRow(Icons.Default.Business, "Departments", departments?.joinToString(", ") { it.name } ?: "Unassigned")
                        }
                    }
                }

                if (!capabilities.isNullOrEmpty()) {
                    item {
                        Text(
                            "ELEVATED OVERRIDES",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                            letterSpacing = 2.sp,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                capabilities.forEach { cap ->
                                    val isForever = cap.expiresAt.isNullOrEmpty()
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.Shield,
                                                contentDescription = null,
                                                tint = Color(0xFF4A8EFF),
                                                modifier = Modifier.size(18.dp)
                                            )
                                            Spacer(Modifier.width(10.dp))
                                            Text(
                                                text = cap.capabilityName,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.SemiBold,
                                                color = Color(0xFFDAE2FD)
                                            )
                                        }
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = if (isForever) Color(0xFF22C55E).copy(alpha = 0.15f) else Color(0xFF4A8EFF).copy(alpha = 0.15f)
                                        ) {
                                            Text(
                                                text = if (isForever) "Permanent" else "Active",
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                style = MaterialTheme.typography.labelSmall,
                                                color = if (isForever) Color(0xFF22C55E) else Color(0xFF4A8EFF),
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }


                item {
                    Text(
                        "CLINICAL MODULES",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
                if (assignedCourses.isNullOrEmpty()) {
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                Text("No assigned modules found", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                            }
                        }
                    }
                } else {
                    items(assignedCourses.size) { index ->
                        val course = assignedCourses[index]
                        GlassCard(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                    modifier = Modifier.size(40.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Book,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                                Spacer(Modifier.width(16.dp))
                                Column {
                                    Text(course.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    Text(
                                        "Code: ${course.courseCode ?: "N/A"}  ·  Year ${course.academicYear ?: 1} • Semester ${course.semester ?: 1}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ── Super Admin Transition Panel ────────────────────
            if (state.role.lowercase() == "super_admin") {
                item {
                    Text(
                        "SECURITY & TRANSITIONS",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
                item {
                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.05f)
                    ) {
                        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.VpnKey, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                Spacer(Modifier.width(12.dp))
                                Text("Academic Transition Key", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                            }
                            Text(
                                "This key is required for global academic term promotion and data resets. Keep it confidential.",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                            Button(
                                onClick = { /* Navigate to key mgmt or show dialog */ },
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().height(40.dp)
                            ) {
                                Text("Manage Transition Key", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // ── Performance Access ─────────────────────────────
            if (state.role.lowercase() == "student") {
                item {
                    Button(
                        onClick = onNavigatePerformance,
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                    ) {
                        Icon(Icons.Default.BarChart, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                        Spacer(Modifier.width(12.dp))
                        Text("Detailed Performance Data", color = MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // Redundant Logout removed as per request
            item {
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun StatCard(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier, color: Color) {
    GlassCard(modifier = modifier) {
        Column(
            modifier = Modifier.padding(16.dp).fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
            Column {
                Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, color = color)
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
        }
    }
}

@Composable
fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(16.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            Text(value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
        }
    }
}
