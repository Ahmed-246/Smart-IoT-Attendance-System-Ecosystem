package com.attendance.app.ui.gradebook

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.model.GradeResult
import com.attendance.app.ui.components.GlassCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradebookScreen(
    onBack: () -> Unit,
    vm: GradebookViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()

    Scaffold(
        containerColor = Color(0xFF070707),
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
                title = { Text("Gradebook Editor", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.White) }
                },
                actions = {
                    IconButton(onClick = vm::loadData) { Icon(imageVector = Icons.Default.Refresh, contentDescription = null, tint = Color.White) }
                    
                    TextButton(
                        onClick = { vm.commitGrades(true) },
                        enabled = !state.isSaving && !state.isLoading && state.grades.isNotEmpty()
                    ) {
                        Text("FINALIZE", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                    }

                    Surface(
                        onClick = { vm.commitGrades(false) },
                        enabled = !state.isSaving && !state.isLoading,
                        shape = RoundedCornerShape(12.dp),
                        color = Color.Transparent,
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .background(Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF8B5CF6))))
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(imageVector = Icons.Default.Save, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("SAVE", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (state.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF3B82F6))
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        Text(
                            "ASSESSMENT #${state.assessmentId} AUDIT",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF3B82F6),
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                    }

                    items(state.grades) { grade ->
                        GradeRow(grade, onGradeChanged = { vm.onGradeChanged(grade.studentId, it) }, onToggleAbsent = { vm.onToggleAbsent(grade.studentId) })
                    }
                }
            }
        }
    }
}

@Composable
fun GradeRow(grade: GradeResult, onGradeChanged: (String) -> Unit, onToggleAbsent: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.05f), modifier = Modifier.size(40.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text(grade.studentName?.take(1)?.uppercase() ?: "?", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(grade.studentName ?: "Unknown", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold, color = Color.White)
                Text(grade.universityId ?: "ID: N/A", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.4f))
            }
            
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = grade.isAbsent,
                        onCheckedChange = { onToggleAbsent() },
                        colors = CheckboxDefaults.colors(checkedColor = Color(0xFFEF4444), uncheckedColor = Color.White.copy(alpha = 0.3f))
                    )
                    Text("ABSENT", style = MaterialTheme.typography.labelSmall, color = if (grade.isAbsent) Color(0xFFEF4444) else Color.White.copy(alpha = 0.3f))
                }

                if (!grade.isAbsent) {
                    OutlinedTextField(
                        value = if (grade.rawScore == 0.0) "" else grade.rawScore.toInt().toString(),
                        onValueChange = onGradeChanged,
                        modifier = Modifier.width(80.dp),
                        textStyle = MaterialTheme.typography.titleMedium.copy(color = Color.White, fontWeight = FontWeight.Bold),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color.White.copy(alpha = 0.1f),
                            focusedBorderColor = Color(0xFF3B82F6),
                            cursorColor = Color(0xFF3B82F6)
                        ),
                        placeholder = { Text("0", color = Color.White.copy(alpha = 0.2f)) }
                    )
                }
            }
        }
    }
}
