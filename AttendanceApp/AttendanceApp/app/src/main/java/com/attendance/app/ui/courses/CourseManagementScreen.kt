package com.attendance.app.ui.courses

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.components.FilterDropdown
import com.attendance.app.ui.components.GlassCard
import com.attendance.app.ui.login.GlassTextField

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseManagementScreen(
    onBack: () -> Unit,
    onNavigateToGradebook: (Int) -> Unit,
    vm: CourseManagementViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(modifier = Modifier.fillMaxSize()) {
            com.attendance.app.ui.components.SectionHeader(
                title = "Course Management",
                icon = Icons.Default.LibraryBooks,
                actions = {
                    IconButton(onClick = { vm.showCreateCourseDialog(true) }) { Icon(imageVector = Icons.Default.Add, contentDescription = null) }
                }
            )

            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                if (state.isLoading) {
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.height(16.dp))
                }

                state.error?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelMedium)
                    Spacer(Modifier.height(16.dp))
                }

                // Course Selector Header with Filters Toggle Button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Select Course", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    TextButton(
                        onClick = { vm.toggleFilters() },
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Icon(
                            imageVector = if (state.showFilters) Icons.Default.FilterListOff else Icons.Default.FilterList,
                            contentDescription = "Toggle Filters",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            if (state.showFilters) "Hide Filters" else "Filters",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 14.sp
                        )
                    }
                }
                
                // Filters Panel
                if (state.showFilters) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp)
                            .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(16.dp))
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Faculty
                            val selectedFacultyName = state.faculties.find { it.id == state.selectedFacultyId }?.name ?: "All Faculties"
                            FilterDropdown(
                                label = "Faculty",
                                selectedValue = selectedFacultyName,
                                items = state.faculties,
                                itemLabel = { it.name },
                                onValueChange = { vm.setFacultyFilter(it?.id) },
                                modifier = Modifier.weight(1f)
                            )
                            // Department
                            val filteredDepts = if (state.selectedFacultyId != null) {
                                state.departments.filter { it.facultyId == state.selectedFacultyId }
                            } else {
                                state.departments
                            }
                            val selectedDeptName = state.departments.find { it.id == state.selectedDepartmentId }?.name ?: "All Departments"
                            FilterDropdown(
                                label = "Department",
                                selectedValue = selectedDeptName,
                                items = filteredDepts,
                                itemLabel = { it.name },
                                onValueChange = { vm.setDepartmentFilter(it?.id) },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Year
                            val years = listOf(1, 2, 3, 4, 5, 6)
                            val selectedYearLabel = state.selectedYear?.let { "Year $it" } ?: "All Years"
                            FilterDropdown(
                                label = "Academic Year",
                                selectedValue = selectedYearLabel,
                                items = years,
                                itemLabel = { "Year $it" },
                                onValueChange = { vm.setYearFilter(it) },
                                modifier = Modifier.weight(1f)
                            )
                            // Semester
                            val semesters = listOf(1, 2)
                            val selectedSemesterLabel = state.selectedSemester?.let { "Semester $it" } ?: "All Semesters"
                            FilterDropdown(
                                label = "Semester",
                                selectedValue = selectedSemesterLabel,
                                items = semesters,
                                itemLabel = { "Semester $it" },
                                onValueChange = { vm.setSemesterFilter(it) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = { vm.clearFilters() }) {
                                Text("Clear Filters", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                } else {
                    Spacer(Modifier.height(10.dp))
                }

                if (state.filteredCourses.isEmpty()) {
                    Box(Modifier.fillMaxWidth().height(48.dp), contentAlignment = Alignment.Center) {
                        Text("No courses match filters", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), style = MaterialTheme.typography.bodyMedium)
                    }
                } else {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(state.filteredCourses) { course ->
                            val isSelected = state.selectedCourseId == course.id
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                modifier = Modifier.clickable { vm.selectCourse(course.id) }
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                                    Text(
                                        text = course.name,
                                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                    if (isSelected && (state.userRole == "admin" || state.userRole == "super_admin")) {
                                        Spacer(Modifier.width(8.dp))
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Delete Course",
                                            tint = if (isSelected) MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f) else MaterialTheme.colorScheme.error,
                                            modifier = Modifier.size(14.dp).clickable { vm.deleteCourse(course.id) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Assessments", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    IconButton(onClick = { vm.showCreateDialog(true) }) {
                        Icon(imageVector = Icons.Default.AddCircle, contentDescription = "New Assessment", tint = MaterialTheme.colorScheme.primary)
                    }
                }
                Spacer(Modifier.height(8.dp))

                val courseAssessments = state.assessments.filter { it.courseCode == state.selectedCourseId || it.courseId == state.selectedCourseId }
                if (courseAssessments.isEmpty()) {
                    Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                        Text("No assessments found for this course.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                } else {
                    LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(courseAssessments) { assessment ->
                            GlassCard(modifier = Modifier.fillMaxWidth().clickable { onNavigateToGradebook(assessment.id) }) {
                                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), modifier = Modifier.size(40.dp)) {
                                        Box(contentAlignment = Alignment.Center) { Icon(imageVector = Icons.AutoMirrored.Filled.Assignment, contentDescription = null, tint = MaterialTheme.colorScheme.primary) }
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(assessment.title ?: "Untitled", fontWeight = FontWeight.Bold)
                                        Text("${assessment.assessmentType ?: assessment.type ?: "N/A"} - Max ${assessment.maxScore ?: 0.0}", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), style = MaterialTheme.typography.labelSmall)
                                    }
                                    val status = assessment.status ?: "Pending"
                                    Surface(shape = RoundedCornerShape(20.dp), color = if (status == "Finished") Color(0xFF22C55E).copy(alpha = 0.1f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)) {
                                        Text(status, color = if (status == "Finished") Color(0xFF22C55E) else MaterialTheme.colorScheme.primary, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (state.showCreateDialog) {
        CreateAssessmentDialog(
            onDismiss = { vm.showCreateDialog(false) },
            onCreate = { title, type, max -> vm.createAssessment(title, type, max) },
            isCreating = state.isCreatingAssessment
        )
    }

    if (state.showCreateCourseDialog) {
        CreateCourseDialog(
            onDismiss = { vm.showCreateCourseDialog(false) },
            onConfirm = { req -> vm.createCourse(req) }
        )
    }
}

@Composable
fun CreateCourseDialog(onDismiss: () -> Unit, onConfirm: (com.attendance.app.model.CourseCreate) -> Unit) {
    var name by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var credits by remember { mutableStateOf("3.0") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        title = { Text("New Course Registry", color = MaterialTheme.colorScheme.onSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Course Name") })
                OutlinedTextField(value = code, onValueChange = { code = it }, label = { Text("Course Code") })
                OutlinedTextField(value = credits, onValueChange = { credits = it }, label = { Text("Credits") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            }
        },
        confirmButton = {
            Button(onClick = { if (name.isNotBlank()) onConfirm(com.attendance.app.model.CourseCreate(name, code, credits = credits.toDoubleOrNull() ?: 3.0)) }) {
                Text("Register Course")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun CreateAssessmentDialog(
    onDismiss: () -> Unit,
    onCreate: (String, String, String) -> Unit,
    isCreating: Boolean
) {
    var title by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("Quiz") }
    var maxScore by remember { mutableStateOf("10.0") }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("New Assessment", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                
                GlassTextField(title, { title = it }, "Assessment Title", Icons.Default.Title)
                GlassTextField(type, { type = it }, "Type (e.g. Quiz, Midterm, Lab)", Icons.Default.Category)
                GlassTextField(maxScore, { maxScore = it }, "Max Score", Icons.Default.Score, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("CANCEL", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)) }
                    Spacer(Modifier.width(8.dp))
                    Button(onClick = { onCreate(title, type, maxScore) }, enabled = !isCreating) {
                        if (isCreating) CircularProgressIndicator(Modifier.size(16.dp), color = MaterialTheme.colorScheme.onPrimary)
                        else Text("CREATE")
                    }
                }
            }
        }
    }
}
