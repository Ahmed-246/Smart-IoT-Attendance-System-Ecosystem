package com.attendance.app.ui.performance

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.attendance.app.ui.components.SectionHeader
import com.attendance.app.model.StudentProfileOut

@Composable
fun PerformanceScreen(
    onBack: () -> Unit,
    vm: PerformanceViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        if (state.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else if (state.error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }
        } else if (state.profile == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No data available", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            }
        } else {
            val profile = state.profile!!
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    com.attendance.app.ui.components.SectionHeader("Academic Performance", Icons.Default.Assessment)
                }

                // Summary Section
                item { PerformanceSummary(profile) }

                // ── Performance Trends (Linear Analysis) ──
                item {
                    PerformanceTrendCard(
                        attendanceTrend = state.attendanceTrend,
                        gradeTrend = state.gradeTrend
                    )
                }

                // Attendance Section
                item { LocalSectionHeader("Attendance Analytics", Icons.Default.BarChart) }
                item { AttendanceCard(profile.attendancePercentage) }

                // Course Breakdown Section
                item { LocalSectionHeader("Course-by-Course Stats", Icons.Default.LibraryBooks) }
                items(profile.enrolledCourses) { course ->
                    val committedGrade = profile.committedGrades.find { it.assessmentId == course.id }
                    CoursePerformanceCard(course.name, profile.attendancePercentage, committedGrade?.rawScore)
                }
            }
        }
    }
}

@Composable
fun PerformanceSummary(profile: StudentProfileOut) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("OVERALL STATUS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), letterSpacing = 2.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                profile.student.academicStatus ?: "ACTIVE",
                style = MaterialTheme.typography.headlineMedium,
                color = if (profile.attendancePercentage > 75) Color(0xFF22C55E) else Color(0xFFEAB308),
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                SummaryStat("Total Courses", profile.enrolledCourses.size.toString())
                SummaryStat("Attendance", "${profile.attendancePercentage.toInt()}%")
            }
        }
    }
}

@Composable
fun AttendanceCard(percentage: Double) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Current Pace", fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Text("${percentage.toInt()}%", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.ExtraBold)
            }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { (percentage / 100).toFloat() },
                modifier = Modifier.fillMaxWidth().height(8.dp),
                color = if (percentage > 75) Color(0xFF22C55E) else MaterialTheme.colorScheme.error,
                trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Requirement: 75% for exam eligibility",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
            )
        }
    }
}

@Composable
fun CoursePerformanceCard(name: String, att: Double, grade: Double?) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(name, fontWeight = FontWeight.SemiBold)
                Text("Attendance: ${att.toInt()}%", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
            if (grade != null) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                ) {
                    Text(
                        "${grade.toInt()}",
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun SummaryStat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
    }
}

@Composable
fun LocalSectionHeader(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
        Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text(title.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), letterSpacing = 1.sp)
    }
}

@Composable
fun PerformanceTrendCard(
    attendanceTrend: List<Float>,
    gradeTrend: List<Float>
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.Default.ShowChart, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text("Performance Trends", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                    modifier = Modifier.height(32.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(2.dp)) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (selectedTab == 0) MaterialTheme.colorScheme.primary else Color.Transparent,
                            onClick = { selectedTab = 0 }
                        ) {
                            Text("ATT", style = MaterialTheme.typography.labelSmall, color = if (selectedTab == 0) Color.White else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
                        }
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (selectedTab == 1) Color(0xFF8B5CF6) else Color.Transparent,
                            onClick = { selectedTab = 1 }
                        ) {
                            Text("GRD", style = MaterialTheme.typography.labelSmall, color = if (selectedTab == 1) Color.White else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
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
                    modifier = Modifier.fillMaxWidth().height(140.dp),
                    lineColor = chartColor
                )
            } else {
                Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) {
                    Text("Not enough data yet", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
                }
            }
            
            Spacer(Modifier.height(12.dp))
            Text(
                if (selectedTab == 0) "Running attendance rate over your last 10 sessions" else "Your grade trajectory across assessments",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
            )
        }
    }
}
