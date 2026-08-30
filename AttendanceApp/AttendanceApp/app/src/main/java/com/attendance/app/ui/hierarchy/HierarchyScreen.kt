package com.attendance.app.ui.hierarchy

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.AccountTree
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.components.GlassCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HierarchyScreen(
    onBack: () -> Unit,
    vm: HierarchyViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        containerColor = Color(0xFF070707),
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
                title = { Text("System Hierarchy", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.White) }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.Transparent,
                contentColor = Color(0xFF3B82F6),
                divider = {}
            ) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                    Text("Faculties", modifier = Modifier.padding(16.dp), color = if (selectedTab == 0) Color.White else Color.White.copy(alpha = 0.4f))
                }
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                    Text("Depts", modifier = Modifier.padding(16.dp), color = if (selectedTab == 1) Color.White else Color.White.copy(alpha = 0.4f))
                }
                Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }) {
                    Text("Courses", modifier = Modifier.padding(16.dp), color = if (selectedTab == 2) Color.White else Color.White.copy(alpha = 0.4f))
                }
            }

            if (state.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Color(0xFF3B82F6))
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                when (selectedTab) {
                    0 -> items(state.faculties) { faculty ->
                        HierarchyRow(Icons.Default.Business, faculty.name, faculty.description ?: "No description", Color(0xFF3B82F6))
                    }
                    1 -> items(state.departments) { dept ->
                        HierarchyRow(Icons.Default.AccountTree, dept.name, "Faculty ID: ${dept.facultyId}", Color(0xFF8B5CF6))
                    }
                    2 -> items(state.courses) { course ->
                        HierarchyRow(Icons.Default.AutoStories, course.name, course.courseCode ?: "No code", Color(0xFF22C55E))
                    }
                }
            }
        }
    }
}

@Composable
fun HierarchyRow(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, sub: String, tint: Color) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(8.dp), color = tint.copy(alpha = 0.1f), modifier = Modifier.size(40.dp)) {
                Box(contentAlignment = Alignment.Center) { Icon(imageVector = icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(title, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                Text(sub, color = Color.White.copy(alpha = 0.5f), style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
