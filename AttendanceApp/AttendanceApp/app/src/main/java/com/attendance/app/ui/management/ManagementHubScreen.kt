package com.attendance.app.ui.management

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.material.icons.filled.Schema
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.attendance.app.ui.components.GlassCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManagementHubScreen(
    onBack: () -> Unit,
    onNavigateStudents: () -> Unit,
    onNavigateDoctors: () -> Unit,
    onNavigateAdmins: () -> Unit,
    onNavigateHierarchy: () -> Unit,
    onNavigateCourses: () -> Unit
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("System Hub", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    "System Administration",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                    letterSpacing = 2.sp,
                    modifier = Modifier.padding(start = 8.dp, bottom = 8.dp)
                )
            }

            item {
                ManagementMenuCard(
                    title = "Students Directory",
                    subtitle = "Manage Student Profiles & Metrics",
                    icon = Icons.Default.School,
                    color = MaterialTheme.colorScheme.primary,
                    onClick = onNavigateStudents
                )
            }

            item {
                ManagementMenuCard(
                    title = "Doctors & Instructors",
                    subtitle = "Manage Academic Staff & Assignments",
                    icon = Icons.Default.MedicalServices,
                    color = Color(0xFFEAB308),
                    onClick = onNavigateDoctors
                )
            }

            item {
                ManagementMenuCard(
                    title = "System Admins",
                    subtitle = "Manage Administrators & Access",
                    icon = Icons.Default.AdminPanelSettings,
                    color = MaterialTheme.colorScheme.error,
                    onClick = onNavigateAdmins
                )
            }

            item {
                ManagementMenuCard(
                    title = "Academic Hierarchy",
                    subtitle = "Faculties & Departmental Registry",
                    icon = Icons.Default.Schema,
                    color = Color(0xFF22C55E),
                    onClick = onNavigateHierarchy
                )
            }

            item {
                ManagementMenuCard(
                    title = "Course Inventory",
                    subtitle = "Manage Course Details & Assign Staff",
                    icon = Icons.Default.LibraryBooks,
                    color = Color(0xFFEAB308),
                    onClick = onNavigateCourses
                )
            }
        }
    }
}

@Composable
fun ManagementMenuCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = color.copy(alpha = 0.1f),
                modifier = Modifier.size(52.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            Spacer(Modifier.width(20.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            }
            Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
        }
    }
}
