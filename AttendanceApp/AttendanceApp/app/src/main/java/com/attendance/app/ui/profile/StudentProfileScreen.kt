package com.attendance.app.ui.profile

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.components.GlassCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentProfileScreen(
    studentId: Int,
    onBack: () -> Unit,
    vm: StudentProfileViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Color.Transparent
                ),
                title = {
                    Text(
                        "Student Dossier",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { padding ->
        when {
            state.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }

            state.error != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.ErrorOutline,
                            null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(Modifier.height(16.dp))
                        Text(
                            state.error ?: "Unknown error",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(Modifier.height(16.dp))
                        OutlinedButton(onClick = { vm.retry() }) {
                            Text("Retry")
                        }
                    }
                }
            }

            state.student != null -> {
                val student = state.student!!
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                    contentPadding = PaddingValues(bottom = 32.dp)
                ) {
                    // ── Hero Cover Section ──────────────────────
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(240.dp)
                                .padding(top = 8.dp),
                            contentAlignment = Alignment.TopCenter
                        ) {
                            // Gradient Cover
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(120.dp)
                                    .clip(RoundedCornerShape(24.dp))
                                    .background(
                                        Brush.horizontalGradient(
                                            colors = listOf(
                                                MaterialTheme.colorScheme.primary,
                                                MaterialTheme.colorScheme.tertiary,
                                                MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)
                                            )
                                        )
                                    )
                            )

                            Column(
                                modifier = Modifier.padding(top = 50.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                // Avatar
                                Box(contentAlignment = Alignment.BottomEnd) {
                                    Surface(
                                        shape = CircleShape,
                                        color = MaterialTheme.colorScheme.surface,
                                        modifier = Modifier
                                            .size(110.dp)
                                            .border(
                                                4.dp,
                                                MaterialTheme.colorScheme.background,
                                                CircleShape
                                            )
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                Icons.Default.School,
                                                null,
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(48.dp)
                                            )
                                        }
                                    }

                                    // Status indicator
                                    val statusColor = when (student.academicStatus?.lowercase()) {
                                        "active" -> Color(0xFF22C55E)
                                        "suspended", "blacklisted" -> Color(0xFFEF4444)
                                        "warning" -> Color(0xFFF59E0B)
                                        else -> Color(0xFF22C55E)
                                    }
                                    Surface(
                                        shape = CircleShape,
                                        color = statusColor,
                                        modifier = Modifier
                                            .size(24.dp)
                                            .border(
                                                3.dp,
                                                MaterialTheme.colorScheme.background,
                                                CircleShape
                                            )
                                    ) {}
                                }

                                Spacer(Modifier.height(12.dp))

                                Text(
                                    text = student.name,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Black,
                                    color = MaterialTheme.colorScheme.onBackground
                                )

                                Text(
                                    text = student.email,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
                                )

                                Spacer(Modifier.height(6.dp))

                                // Status / Role Badge
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Surface(
                                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                                        shape = RoundedCornerShape(100.dp)
                                    ) {
                                        Text(
                                            text = "STUDENT",
                                            modifier = Modifier.padding(
                                                horizontal = 14.dp,
                                                vertical = 4.dp
                                            ),
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                                            letterSpacing = 1.sp
                                        )
                                    }

                                    if (student.isBlacklisted == true) {
                                        Surface(
                                            color = Color(0xFFEF4444).copy(alpha = 0.15f),
                                            shape = RoundedCornerShape(100.dp)
                                        ) {
                                            Text(
                                                text = "BLACKLISTED",
                                                modifier = Modifier.padding(
                                                    horizontal = 14.dp,
                                                    vertical = 4.dp
                                                ),
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFFEF4444),
                                                letterSpacing = 1.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── Metrics Bento Grid ──────────────────────
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(110.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            StudentMetricCard(
                                label = "Attendance",
                                value = "${state.attendancePercentage.toInt()}%",
                                icon = Icons.Default.TrendingUp,
                                color = if (state.attendancePercentage >= 75) Color(0xFF22C55E)
                                else Color(0xFFEF4444),
                                modifier = Modifier.weight(1f)
                            )
                            StudentMetricCard(
                                label = "Sessions",
                                value = "${state.attendedSessions}/${state.totalSessions}",
                                icon = Icons.Default.CalendarMonth,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.weight(1f)
                            )
                            StudentMetricCard(
                                label = "Courses",
                                value = "${state.enrolledCourses.size}",
                                icon = Icons.Default.LibraryBooks,
                                color = Color(0xFF8B5CF6),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // ── Academic Identity ───────────────────────
                    item {
                        Text(
                            "ACADEMIC IDENTITY",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                            letterSpacing = 2.sp
                        )
                    }

                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                Modifier.padding(20.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                StudentInfoRow(
                                    Icons.Default.Badge,
                                    "University ID",
                                    student.universityId ?: "—"
                                )
                                HorizontalDivider(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                                )
                                StudentInfoRow(
                                    Icons.Default.AccountBalance,
                                    "Faculty",
                                    state.facultyName
                                )
                                HorizontalDivider(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                                )
                                StudentInfoRow(
                                    Icons.Default.School,
                                    "Department",
                                    state.departmentName
                                )
                                HorizontalDivider(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                                )
                                StudentInfoRow(
                                    Icons.Default.DateRange,
                                    "Academic Year",
                                    student.academicYear?.let { "Year $it" } ?: "—"
                                )
                                HorizontalDivider(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                                )
                                StudentInfoRow(
                                    Icons.Default.Schedule,
                                    "Current Semester",
                                    student.currentSemester?.let { "Semester $it" } ?: "—"
                                )
                                HorizontalDivider(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                                )
                                StudentInfoRow(
                                    Icons.Default.Nfc,
                                    "RFID UID",
                                    student.rfidUid
                                )
                            }
                        }
                    }

                    // ── Enrolled Courses ────────────────────────
                    if (state.enrolledCourses.isNotEmpty()) {
                        item {
                            Text(
                                "ENROLLED COURSES",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                                letterSpacing = 2.sp,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }

                        items(state.enrolledCourses) { course ->
                            GlassCard(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = Color(0xFF8B5CF6).copy(alpha = 0.1f),
                                        modifier = Modifier.size(44.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                Icons.Default.MenuBook,
                                                null,
                                                tint = Color(0xFF8B5CF6),
                                                modifier = Modifier.size(22.dp)
                                            )
                                        }
                                    }
                                    Spacer(Modifier.width(14.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            course.name,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            buildString {
                                                course.courseCode?.let { append("$it  •  ") }
                                                append("${course.credits ?: 3.0} Credits")
                                            },
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                                        )
                                    }
                                    course.semester?.let { sem ->
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                                        ) {
                                            Text(
                                                "S$sem",
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onPrimaryContainer
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── Grade Results ───────────────────────────
                    if (state.grades.isNotEmpty()) {
                        item {
                            Text(
                                "COMMITTED GRADES",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                                letterSpacing = 2.sp,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }

                        item {
                            GlassCard(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    state.grades.forEachIndexed { index, grade ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = if (grade.isAbsent) Color(0xFFEF4444).copy(alpha = 0.1f)
                                                else if (grade.isFlagged) Color(0xFFF59E0B).copy(alpha = 0.1f)
                                                else Color(0xFF22C55E).copy(alpha = 0.1f),
                                                modifier = Modifier.size(36.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Icon(
                                                        imageVector = if (grade.isAbsent) Icons.Default.Cancel
                                                        else if (grade.isFlagged) Icons.Default.Flag
                                                        else Icons.Default.CheckCircle,
                                                        contentDescription = null,
                                                        tint = if (grade.isAbsent) Color(0xFFEF4444)
                                                        else if (grade.isFlagged) Color(0xFFF59E0B)
                                                        else Color(0xFF22C55E),
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                            }
                                            Spacer(Modifier.width(12.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    "Assessment #${grade.assessmentId}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                                grade.instructorRemarks?.let {
                                                    Text(
                                                        it,
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                }
                                            }
                                            Text(
                                                "${grade.rawScore}",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Black,
                                                color = if (grade.isAbsent) Color(0xFFEF4444)
                                                else MaterialTheme.colorScheme.onSurface
                                            )
                                        }

                                        if (index < state.grades.size - 1) {
                                            HorizontalDivider(
                                                color = MaterialTheme.colorScheme.onSurface.copy(
                                                    alpha = 0.05f
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── Recent Attendance History ────────────────
                    if (state.attendanceHistory.isNotEmpty()) {
                        item {
                            Text(
                                "ATTENDANCE HISTORY",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                                letterSpacing = 2.sp,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }

                        item {
                            GlassCard(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    val recentRecords = state.attendanceHistory.takeLast(10).reversed()
                                    recentRecords.forEachIndexed { index, record ->
                                        val isPresent = record.status.lowercase() == "present"
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Surface(
                                                shape = CircleShape,
                                                color = if (isPresent) Color(0xFF22C55E).copy(alpha = 0.1f)
                                                else Color(0xFFEF4444).copy(alpha = 0.1f),
                                                modifier = Modifier.size(32.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Icon(
                                                        imageVector = if (isPresent) Icons.Default.CheckCircle
                                                        else Icons.Default.Cancel,
                                                        contentDescription = null,
                                                        tint = if (isPresent) Color(0xFF22C55E)
                                                        else Color(0xFFEF4444),
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                }
                                            }
                                            Spacer(Modifier.width(12.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    if (isPresent) "Present" else "Absent",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = if (isPresent) Color(0xFF22C55E)
                                                    else Color(0xFFEF4444)
                                                )
                                                Text(
                                                    "Session #${record.sessionId}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                                                )
                                            }
                                            Text(
                                                record.timestamp.take(16).replace("T", " "),
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                                                fontSize = 10.sp
                                            )
                                        }

                                        if (index < recentRecords.size - 1) {
                                            HorizontalDivider(
                                                color = MaterialTheme.colorScheme.onSurface.copy(
                                                    alpha = 0.04f
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Bottom spacing
                    item {
                        Spacer(Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}

// ── Private Sub-components ──────────────────────────────────────

@Composable
private fun StudentMetricCard(
    label: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    GlassCard(modifier = modifier.fillMaxHeight()) {
        Column(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = color.copy(alpha = 0.1f),
                modifier = Modifier.size(32.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        icon,
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            Column {
                Text(
                    value,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Black,
                    color = color
                )
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                    fontSize = 10.sp
                )
            }
        }
    }
}

@Composable
private fun StudentInfoRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
            modifier = Modifier.size(32.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        Spacer(Modifier.width(14.dp))
        Column {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                fontSize = 10.sp
            )
            Text(
                value,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
