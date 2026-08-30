package com.attendance.app.ui.onboarding

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.model.Student
import com.attendance.app.model.PreVerifiedStudentOut
import com.attendance.app.model.AutoApproveHistoryItem
import com.attendance.app.ui.components.GlassCard
import com.attendance.app.ui.components.SectionHeader
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    onBack: () -> Unit,
    vm: OnboardingViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            Column(Modifier.background(MaterialTheme.colorScheme.surface)) {
                CenterAlignedTopAppBar(
                    title = { Text("Onboarding Hub", fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, "Back")
                        }
                    },
                    actions = {
                        IconButton(onClick = { vm.loadAll() }) {
                            Icon(Icons.Default.Refresh, "Refresh")
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = Color.Transparent
                    )
                )
                
                // Premium Tabs
                TabRow(
                    selectedTabIndex = state.selectedTab,
                    containerColor = Color.Transparent,
                    contentColor = MaterialTheme.colorScheme.primary,
                    divider = {},
                    indicator = { tabPositions ->
                        if (state.selectedTab < tabPositions.size) {
                            TabRowDefaults.SecondaryIndicator(
                                Modifier.tabIndicatorOffset(tabPositions[state.selectedTab]),
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                ) {
                    OnboardingTab(
                        selected = state.selectedTab == 0,
                        onClick = { vm.setTab(0) },
                        text = "Pending",
                        icon = Icons.Default.PendingActions
                    )
                    OnboardingTab(
                        selected = state.selectedTab == 1,
                        onClick = { vm.setTab(1) },
                        text = "History",
                        icon = Icons.Default.History
                    )
                    OnboardingTab(
                        selected = state.selectedTab == 2,
                        onClick = { vm.setTab(2) },
                        text = "Automation",
                        icon = Icons.Default.AutoMode,
                        badgeCount = state.unseenAutoApproveCount
                    )
                }
            }
        },
        floatingActionButton = {
            if (state.selectedTab == 2) {
                ExtendedFloatingActionButton(
                    onClick = { showAddDialog = true },
                    icon = { Icon(Icons.Default.Add, null) },
                    text = { Text("Pre-Verify Student") },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            Crossfade(targetState = state.selectedTab, label = "TabContent") { tab ->
                when (tab) {
                    0 -> PendingTab(state, vm)
                    1 -> HistoryTab(state)
                    2 -> AutomationTab(state, vm)
                }
            }

            if (state.isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter),
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // Success/Error Toasts
            state.error?.let { err ->
                ErrorMessage(err) { vm.clearMessages() }
            }
            state.successMsg?.let { msg ->
                SuccessMessage(msg) { vm.clearMessages() }
            }
        }
    }

    if (showAddDialog) {
        AddPreVerifyDialog(
            faculties = state.faculties,
            departments = state.departments,
            onDismiss = { showAddDialog = false },
            onConfirm = { uid, name, deptId, year ->
                vm.addToAllowlist(uid, name, deptId, year)
                showAddDialog = false
            }
        )
    }
}

@Composable
fun OnboardingTab(
    selected: Boolean,
    onClick: () -> Unit,
    text: String,
    icon: ImageVector,
    badgeCount: Int = 0
) {
    Tab(
        selected = selected,
        onClick = onClick,
        text = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text, style = MaterialTheme.typography.labelLarge)
                if (badgeCount > 0) {
                    Spacer(Modifier.width(4.dp))
                    Badge { Text(badgeCount.toString()) }
                }
            }
        },
        icon = { Icon(imageVector = icon, contentDescription = null) },
        selectedContentColor = MaterialTheme.colorScheme.primary,
        unselectedContentColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
    )
}

@Composable
fun PendingTab(state: OnboardingUiState, vm: OnboardingViewModel) {
    if (state.pendingStudents.isEmpty() && !state.isLoading) {
        EmptyState("No pending registrations", "Everything is approved!")
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                SectionHeader("Waiting for Approval", Icons.Default.Pending)
            }
            items(state.pendingStudents) { student ->
                PendingStudentCard(
                    student = student,
                    onApprove = { vm.approve(student.id) },
                    onReject = { vm.reject(student.id, "Rejected by admin") }
                )
            }
        }
    }
}

@Composable
fun HistoryTab(state: OnboardingUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (state.approvedHistory.isNotEmpty()) {
            item { SectionHeader("Recently Approved", Icons.Default.CheckCircle, color = Color(0xFF22C55E)) }
            items(state.approvedHistory) { student ->
                HistoryCard(student, true)
            }
        }

        if (state.rejectedHistory.isNotEmpty()) {
            item { Spacer(Modifier.height(16.dp)) }
            item { SectionHeader("Rejected Registrations", Icons.Default.Cancel, color = Color(0xFFEF4444)) }
            items(state.rejectedHistory) { student ->
                HistoryCard(student, false)
            }
        }

        if (state.approvedHistory.isEmpty() && state.rejectedHistory.isEmpty() && !state.isLoading) {
            item { EmptyState("History is empty", "No processed registrations yet.") }
        }
    }
}

@Composable
fun AutomationTab(state: OnboardingUiState, vm: OnboardingViewModel) {
    LaunchedEffect(Unit) {
        if (state.unseenAutoApproveCount > 0) {
            vm.markAutoApproveSeen()
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.1f)
            ) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Auto-Approve System", fontWeight = FontWeight.Bold)
                        Text(
                            "Students on the allowlist are approved instantly upon registration.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }

        item { SectionHeader("Student Allowlist", Icons.Default.ListAlt) }
        
        if (state.allowlist.isEmpty()) {
            item { 
                Text(
                    "No students on allowlist. Add one to enable automation for them.",
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                )
            }
        } else {
            items(state.allowlist) { item ->
                AllowlistCard(item, onRemove = { vm.removeFromAllowlist(item.id) })
            }
        }

        if (state.autoApproveHistory.isNotEmpty()) {
            item { Spacer(Modifier.height(16.dp)) }
            item { SectionHeader("Recent Auto-Approvals", Icons.Default.Bolt, color = Color(0xFFFFD700)) }
            items(state.autoApproveHistory) { item ->
                AutoApproveCard(item)
            }
        }
    }
}

@Composable
fun PendingStudentCard(student: Student, onApprove: () -> Unit, onReject: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            AvatarBox(student.name)
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(student.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyLarge)
                Text("ID: ${student.universityId}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Text(student.email, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(
                    onClick = onApprove,
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color(0xFF22C55E).copy(alpha = 0.1f))
                ) { Icon(Icons.Default.Check, null, tint = Color(0xFF22C55E)) }
                IconButton(
                    onClick = onReject,
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color(0xFFEF4444).copy(alpha = 0.1f))
                ) { Icon(Icons.Default.Close, null, tint = Color(0xFFEF4444)) }
            }
        }
    }
}

@Composable
fun HistoryCard(student: Student, approved: Boolean) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            AvatarBox(student.name, grayscale = true)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(student.name, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f))
                Text(student.universityId ?: "No ID", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            }
            Surface(
                color = (if (approved) Color(0xFF22C55E) else Color(0xFFEF4444)).copy(alpha = 0.1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    if (approved) "APPROVED" else "REJECTED",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (approved) Color(0xFF22C55E) else Color(0xFFEF4444)
                )
            }
        }
    }
}

@Composable
fun AllowlistCard(item: PreVerifiedStudentOut, onRemove: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.Bold)
                Text("University ID: ${item.universityId}", style = MaterialTheme.typography.labelSmall)
                Text("${item.departmentName ?: "Dept ${item.departmentId}"} • Year ${item.academicYear}", 
                    style = MaterialTheme.typography.labelSmall, 
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error.copy(alpha = 0.6f))
            }
        }
    }
}

@Composable
fun AutoApproveCard(item: AutoApproveHistoryItem) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Bolt, null, tint = Color(0xFFFFD700), modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(item.name, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                Text("Auto-approved via Allowlist", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            }
            Text(item.approvedAt.split("T").firstOrNull() ?: "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
        }
    }
}

@Composable
fun AvatarBox(name: String, grayscale: Boolean = false) {
    Surface(
        shape = CircleShape,
        modifier = Modifier.size(40.dp),
        color = if (grayscale) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f) 
                else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                name.take(1).uppercase(),
                fontWeight = FontWeight.Bold,
                color = if (grayscale) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                        else MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun EmptyState(title: String, subtitle: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.CheckCircle, null, 
                modifier = Modifier.size(64.dp), 
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
            Spacer(Modifier.height(12.dp))
            Text(title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            Text(subtitle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
        }
    }
}

@Composable
fun ErrorMessage(msg: String, onDismiss: () -> Unit) {
    LaunchedEffect(msg) {
        kotlinx.coroutines.delay(3000)
        onDismiss()
    }
    Box(Modifier.fillMaxWidth().padding(16.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFEF4444).copy(alpha = 0.9f))) {
        Text(msg, color = Color.White, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun SuccessMessage(msg: String, onDismiss: () -> Unit) {
    LaunchedEffect(msg) {
        kotlinx.coroutines.delay(3000)
        onDismiss()
    }
    Box(Modifier.fillMaxWidth().padding(16.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFF22C55E).copy(alpha = 0.9f))) {
        Text(msg, color = Color.White, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun AddPreVerifyDialog(
    faculties: List<com.attendance.app.model.Faculty>,
    departments: List<com.attendance.app.model.Department>,
    onDismiss: () -> Unit,
    onConfirm: (String, String, Int, Int) -> Unit
) {
    var uid by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var selectedDeptId by remember { mutableStateOf(departments.firstOrNull()?.id ?: 0) }
    var year by remember { mutableStateOf("1") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Pre-Verify Student") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(uid, { uid = it }, label = { Text("University ID") })
                OutlinedTextField(name, { name = it }, label = { Text("Full Name") })
                
                Text("Department", style = MaterialTheme.typography.labelMedium)
                ScrollableTabRow(
                    selectedTabIndex = departments.indexOfFirst { it.id == selectedDeptId }.coerceAtLeast(0),
                    edgePadding = 0.dp
                ) {
                    departments.forEach { dept ->
                        Tab(
                            selected = selectedDeptId == dept.id,
                            onClick = { selectedDeptId = dept.id },
                            text = { Text(dept.name, maxLines = 1) }
                        )
                    }
                }

                OutlinedTextField(year, { year = it }, label = { Text("Academic Year") })
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(uid, name, selectedDeptId, year.toIntOrNull() ?: 1) }) {
                Text("Confirm")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
