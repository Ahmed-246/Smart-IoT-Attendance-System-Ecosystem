package com.attendance.app.ui.session
import androidx.compose.ui.draw.clip
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import com.attendance.app.model.AttendanceReport
import com.attendance.app.model.Session
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
import javax.inject.Inject
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.components.GlassCard

data class SessionsUiState(
    val sessions: List<Session> = emptyList(),
    val enrolledCourses: List<com.attendance.app.model.Course> = emptyList(),
    val faculties: List<com.attendance.app.model.Faculty> = emptyList(),
    val departments: List<com.attendance.app.model.Department> = emptyList(),
    val selectedFacultyId: Int? = null,
    val selectedDeptId: Int? = null,
    val selectedYear: Int? = null,
    val selectedSemester: Int? = null,
    val showHistory: Boolean = false,
    val role: String = "",
    val selectedReport: AttendanceReport? = null,
    val isLoading: Boolean = false,
    val isReportLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SessionsViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SessionsUiState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            repo.getBaseUrlFlow().collectLatest {
                load()
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            // Get role and academic structure
            val currentRole = repo.getRoleFlow().first() ?: "student"
            val studentId = repo.getStudentIdFlow().first() ?: 0
            
            _state.update { it.copy(role = currentRole) }

            // Parallel fetch
            val sessionsJob = async { 
                if (currentRole.lowercase() == "student") {
                    repo.getMySessions()
                } else {
                    if (_state.value.showHistory) repo.getSessionHistory() else repo.getActiveSessions()
                }
            }
            val facultiesJob = async { repo.getFaculties() }
            val deptsJob = async { repo.getDepartments() }
            val coursesJob = async { repo.getCourses() }
            val profileJob = if (currentRole.lowercase() == "student" && studentId > 0) {
                async { repo.getStudentProfile(studentId) }
            } else null

            val sessionsResult = sessionsJob.await()
            val facultiesResult = facultiesJob.await()
            val deptsResult = deptsJob.await()
            val coursesResult = coursesJob.await()
            val profileResult = profileJob?.await()

            _state.update { it.copy(
                sessions = (sessionsResult as? Result.Success)?.data ?: emptyList(),
                faculties = (facultiesResult as? Result.Success)?.data ?: emptyList(),
                departments = (deptsResult as? Result.Success)?.data ?: emptyList(),
                enrolledCourses = if (profileResult is Result.Success) profileResult.data.enrolledCourses else (coursesResult as? Result.Success)?.data ?: emptyList(),
                error = (sessionsResult as? Result.Error)?.message
            ) }

            _state.update { it.copy(isLoading = false) }
        }
    }

    fun toggleHistory() {
        _state.update { it.copy(showHistory = !it.showHistory) }
        load()
    }

    fun setFaculty(id: Int?) = _state.update { it.copy(selectedFacultyId = id, selectedDeptId = null) }
    fun setDept(id: Int?) = _state.update { it.copy(selectedDeptId = id) }
    fun setYear(year: Int?) = _state.update { it.copy(selectedYear = year) }
    fun setSemester(sem: Int?) = _state.update { it.copy(selectedSemester = sem) }

    fun getFilteredSessions(): List<Session> {
        val s = _state.value
        return s.sessions.filter { sess ->
            val course = s.enrolledCourses.find { it.id == sess.courseId } ?: return@filter true
            val dept = s.departments.find { it.id == course.departmentId }
            
            (s.selectedFacultyId == null || dept?.facultyId == s.selectedFacultyId) &&
            (s.selectedDeptId == null || course.departmentId == s.selectedDeptId) &&
            (s.selectedYear == null || course.academicYear == s.selectedYear) &&
            (s.selectedSemester == null || course.semester == s.selectedSemester)
        }
    }

    fun loadReport(sessionId: Int) {
        viewModelScope.launch {
            _state.update { it.copy(isReportLoading = true, selectedReport = null) }
            when (val r = repo.getSessionReport(sessionId)) {
                is Result.Success -> _state.update { it.copy(selectedReport = r.data, isReportLoading = false) }
                is Result.Error   -> _state.update { it.copy(error = r.message, isReportLoading = false) }
                else -> _state.update { it.copy(isReportLoading = false) }
            }
        }
    }

    fun dismissReport() = _state.update { it.copy(selectedReport = null) }
    fun clearError()    = _state.update { it.copy(error = null) }
}

// ── UI ─────────────────────────────────────────────────────────────────────


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionsScreen(
    onBack: () -> Unit,
    onNavigateCreateSession: () -> Unit,
    vm: SessionsViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showFilterSheet by remember { mutableStateOf(false) }

    LaunchedEffect(state.error) {
        state.error?.let { snackbarHostState.showSnackbar(it); vm.clearError() }
    }

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column {
            // ── Header ───────────────────────────────────────
            com.attendance.app.ui.components.SectionHeader(
                title = if (state.showHistory) "Session History" else "Active Sessions",
                icon = if (state.showHistory) Icons.Default.History else Icons.Default.Class,
                actions = {
                    IconButton(onClick = { showFilterSheet = true }) { 
                        Icon(Icons.Default.FilterList, contentDescription = "Filters", tint = if (state.selectedFacultyId != null || state.selectedDeptId != null || state.selectedYear != null || state.selectedSemester != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                    }
                    IconButton(onClick = vm::toggleHistory) { 
                        Icon(
                            if (state.showHistory) Icons.Default.Event else Icons.Default.History, 
                            contentDescription = "Toggle History"
                        ) 
                    }
                    IconButton(onClick = onNavigateCreateSession) { Icon(imageVector = Icons.Default.Add, contentDescription = null) }
                }
            )

            if (state.isLoading && state.sessions.isEmpty()) {
                Box(Modifier.fillMaxSize().weight(1f), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary, strokeWidth = 3.dp)
                        Spacer(Modifier.height(16.dp))
                        Text("Fetching data...", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                }
            } else if (state.error != null && state.sessions.isEmpty()) {
                Box(Modifier.fillMaxSize().weight(1f).padding(24.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.CloudOff, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text(state.error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        Spacer(Modifier.height(24.dp))
                        Button(onClick = { vm.load() }) {
                            Text("Try Again")
                        }
                    }
                }
            } else {
                val filtered = vm.getFilteredSessions()
                LazyColumn(
                    modifier = Modifier.fillMaxSize().weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (filtered.isEmpty()) {
                        item {
                            GlassCard(modifier = Modifier.fillMaxWidth()) {
                                Box(
                                    Modifier.fillMaxWidth().padding(32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        "No sessions found matching filters",
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                            }
                        }
                    } else {
                        items(filtered) { session ->
                            SessionDetailCard(
                                session = session,
                                isReportLoading = state.isReportLoading,
                                onViewReport = { vm.loadReport(session.id) }
                            )
                        }
                    }

                    // ── Enrolled Courses (Student Only) ────────────────────────
                    if (state.role.lowercase() == "student" && state.enrolledCourses.isNotEmpty() && !state.showHistory) {
                        item {
                            Spacer(Modifier.height(12.dp))
                            com.attendance.app.ui.components.SectionHeader(
                                title = "Your Enrolled Courses",
                                icon = Icons.Default.LibraryBooks
                            )
                        }

                        items(state.enrolledCourses) { course ->
                            CourseSessionCard(course = course)
                        }
                    }
                }
            }
        }
    }

    // Report bottom sheet
    state.selectedReport?.let { report ->
        ReportBottomSheet(report = report, onDismiss = vm::dismissReport)
    }

    // Filter bottom sheet
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
    state: SessionsUiState,
    vm: SessionsViewModel,
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
                Text("Filter Sessions", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
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
private fun SessionDetailCard(
    session: Session,
    isReportLoading: Boolean,
    onViewReport: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                    modifier = Modifier.size(42.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(imageVector = Icons.Default.Class, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Session #${session.id}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "Course #${session.courseId}  ·  ${session.startTime.take(16).replace("T", " ")}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFF22C55E).copy(alpha = 0.12f)
                ) {
                    Text(
                        "Active",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF22C55E),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
            Spacer(Modifier.height(16.dp))

            Button(
                onClick = onViewReport,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isReportLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                ),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (isReportLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp,
                        color = Color(0xFF0A0A0A))
                    Spacer(Modifier.width(8.dp))
                }
                Icon(imageVector = Icons.Default.Assessment, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("View Attendance Report", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportBottomSheet(
    report: AttendanceReport,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 48.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(report.courseName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

            // Stats row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                ReportStat("Total", "${report.totalStudents}", MaterialTheme.colorScheme.onSurface)
                ReportStat("Present", "${report.present}", Color(0xFF22C55E))
                ReportStat("Absent", "${report.absent}", Color(0xFFEF4444))
                ReportStat("Rate", "${report.attendanceRate}%", MaterialTheme.colorScheme.primary)
            }

            // Progress bar
            LinearProgressIndicator(
                progress = { (report.attendanceRate / 100).toFloat() },
                modifier = Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(5.dp)),
                trackColor = Color.White.copy(alpha = 0.1f),
                color = when {
                    report.attendanceRate >= 80 -> Color(0xFF22C55E)
                    report.attendanceRate >= 60 -> Color(0xFFE65100)
                    else -> Color(0xFFEF4444)
                }
            )

            Text(
                "${report.present} of ${report.totalStudents} students present",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
        }
    }
}

@Composable
private fun ReportStat(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.headlineMedium, color = color,
            fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
    }
}

@Composable
private fun CourseSessionCard(course: com.attendance.app.model.Course) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
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
            
            Column(Modifier.weight(1f)) {
                Text(course.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(
                    "Code: ${course.courseCode ?: "N/A"}  ·  ${course.credits ?: 0.0} Credits",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
            }
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f)
            )
        }
    }
}
