package com.attendance.app.ui.assessments

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.model.Assessment
import com.attendance.app.ui.components.GlassCard
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.FilterListOff

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssessmentsScreen(
    role: String,
    onBack: () -> Unit,
    onNavigateToGradebook: (Int) -> Unit,
    onNavigateToPerformance: () -> Unit,
    vm: AssessmentsViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    val isStudent = role.lowercase() == "student"
    var showFilterSheet by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column {
            // ── Top Header ─────────────────────────────────────
            com.attendance.app.ui.components.SectionHeader(
                title = "Academic Assessments", 
                icon = Icons.Default.Assignment,
                actions = {
                    IconButton(onClick = { showFilterSheet = true }) { 
                        Icon(Icons.Default.FilterList, contentDescription = "Filters", tint = if (state.selectedFacultyId != null || state.selectedDeptId != null || state.selectedYear != null || state.selectedSemester != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                    }
                    IconButton(onClick = { vm.loadData() }) { Icon(Icons.Default.Refresh, null) }
                }
            )


            if (state.isLoading) {
                Box(Modifier.fillMaxSize().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else {
                val filtered = vm.getFilteredAssessments()
                if (filtered.isEmpty()) {
                    Box(Modifier.fillMaxSize().weight(1f), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.FilterListOff, null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f), modifier = Modifier.size(48.dp))
                            Text("No matching assessments", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                            TextButton(onClick = { 
                                vm.setFaculty(null)
                                vm.setYear(null)
                                vm.setSemester(null)
                            }) { Text("Clear Filters") }
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().weight(1f),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filtered) { assessment ->
                            AssessmentCard(
                                assessment = assessment,
                                courseName = state.courses.find { it.id == assessment.courseId }?.name ?: "Course #${assessment.courseId}",
                                onClick = { 
                                    if (isStudent) onNavigateToPerformance()
                                    else onNavigateToGradebook(assessment.id)
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showFilterSheet) {
        FilterBottomSheet(
            state = state,
            vm = vm,
            onDismiss = { showFilterSheet = false }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterBottomSheet(
    state: AssessmentsUiState,
    vm: AssessmentsViewModel,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
        dragHandle = { BottomSheetDefaults.DragHandle(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Filter Assessments", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                TextButton(onClick = { 
                    vm.setFaculty(null)
                    vm.setDept(null)
                    vm.setYear(null)
                    vm.setSemester(null)
                }) {
                    Text("Clear All", color = MaterialTheme.colorScheme.error)
                }
            }

            // Faculty Filter
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Faculty", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        FilterChip(
                            selected = state.selectedFacultyId == null,
                            onClick = { vm.setFaculty(null) },
                            label = { Text("All") },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), selectedLabelColor = MaterialTheme.colorScheme.primary)
                        )
                    }
                    items(state.faculties) { f ->
                        FilterChip(
                            selected = state.selectedFacultyId == f.id,
                            onClick = { vm.setFaculty(f.id) },
                            label = { Text(f.name) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), selectedLabelColor = MaterialTheme.colorScheme.primary)
                        )
                    }
                }
            }

            // Department Filter
            if (state.selectedFacultyId != null) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Department", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val depts = state.departments.filter { it.facultyId == state.selectedFacultyId }
                        item {
                            FilterChip(
                                selected = state.selectedDeptId == null,
                                onClick = { vm.setDept(null) },
                                label = { Text("All") },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), selectedLabelColor = MaterialTheme.colorScheme.primary)
                            )
                        }
                        items(depts) { d ->
                            FilterChip(
                                selected = state.selectedDeptId == d.id,
                                onClick = { vm.setDept(d.id) },
                                label = { Text(d.name) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), selectedLabelColor = MaterialTheme.colorScheme.primary)
                            )
                        }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(24.dp), modifier = Modifier.fillMaxWidth()) {
                // Year Filter
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Academic Year", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(1, 2, 3, 4, 5).forEach { y ->
                            item {
                                FilterChip(
                                    selected = state.selectedYear == y,
                                    onClick = { vm.setYear(if (state.selectedYear == y) null else y) },
                                    label = { Text("$y") },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), selectedLabelColor = MaterialTheme.colorScheme.primary)
                                )
                            }
                        }
                    }
                }

                // Semester Filter
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Semester", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(1, 2).forEach { s ->
                            item {
                                FilterChip(
                                    selected = state.selectedSemester == s,
                                    onClick = { vm.setSemester(if (state.selectedSemester == s) null else s) },
                                    label = { Text("$s") },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), selectedLabelColor = MaterialTheme.colorScheme.primary)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            Button(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Apply Filters", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun AssessmentCard(
    assessment: Assessment,
    courseName: String,
    onClick: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable { onClick() }) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.AutoMirrored.Filled.Assignment, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(assessment.title ?: "Untitled", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                Text(courseName, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatusBadge(assessment.status ?: "Pending")
                    TypeBadge(assessment.type ?: assessment.assessmentType ?: "N/A")
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${(assessment.weightPct ?: 0.0).toInt()}%", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("WEIGHT", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f), fontSize = 10.sp)
            }
        }
    }
}

@Composable
fun StatusBadge(status: String) {
    val color = when(status.lowercase()) {
        "finished" -> Color(0xFF1B7A4E)
        "active" -> Color(0xFFEF4444)
        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
    }
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            status.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            fontSize = 9.sp
        )
    }
}

@Composable
fun TypeBadge(type: String) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.03f),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
    ) {
        Text(
            type.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            fontSize = 9.sp
        )
    }
}
