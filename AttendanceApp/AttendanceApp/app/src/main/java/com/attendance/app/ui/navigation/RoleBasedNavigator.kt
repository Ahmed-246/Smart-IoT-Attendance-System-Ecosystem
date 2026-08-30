package com.attendance.app.ui.navigation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.Color
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.compose.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.surfaceColorAtElevation
import coil.compose.rememberAsyncImagePainter
import coil.compose.AsyncImage
import com.attendance.app.data.TokenStore
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

data class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleBasedNavigator(
    tokenStore: TokenStore,
    wifiHelper: com.attendance.app.hardware.wifi.WifiHelper,
    onLogout: () -> Unit
) {
    val role by tokenStore.role.collectAsState(initial = "student")
    val name by tokenStore.name.collectAsState(initial = "User")
    val email by tokenStore.email.collectAsState(initial = "")
    val profileImage by tokenStore.profileImageUrl.collectAsState(initial = null)
    
    val scope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val navController = rememberNavController()
 
    val navItems = remember(role) {
        val common = listOf(
            BottomNavItem("dashboard", "Dashboard", Icons.Default.Dashboard),
            BottomNavItem("chatbot", "AI Assistant", Icons.Default.Face),
            BottomNavItem("profile", "My Profile", Icons.Default.Person)
        )
        
        val specific = when (role?.lowercase()) {
            "super_admin", "admin" -> listOf(
                BottomNavItem("sessions", "Sessions", Icons.Default.CalendarToday),
                BottomNavItem("assessments", "Assessments", Icons.Default.Assignment),
                BottomNavItem("approvals", "Onboarding Hub", Icons.Default.Groups),
                BottomNavItem("iot", "IoT Map", Icons.Default.Settings),
                BottomNavItem("management", "System Hub", Icons.Default.Build),
                BottomNavItem("monitoring", "System Monitoring", Icons.Default.Info),
                BottomNavItem("app_settings", "App Settings", Icons.Default.Settings)
            )
            "engineer" -> listOf(
                BottomNavItem("iot", "IoT Workshop", Icons.Default.Build),
                BottomNavItem("sessions", "Sessions", Icons.Default.CalendarToday),
                BottomNavItem("app_settings", "App Settings", Icons.Default.Settings)
            )
            "doctor" -> listOf(
                BottomNavItem("assessments", "Assessments", Icons.Default.Assignment),
                BottomNavItem("sessions", "Sessions", Icons.Default.CalendarToday),
                BottomNavItem("app_settings", "App Settings", Icons.Default.Settings)
            )
            else -> listOf( // Student
                BottomNavItem("performance", "Performance", Icons.Default.TrendingUp),
                BottomNavItem("sessions", "My Classes", Icons.Default.School),
                BottomNavItem("app_settings", "App Settings", Icons.Default.Settings)
            )
        }
        (common + specific).filter { it.route != "app_settings" }.distinctBy { it.route }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerShape = androidx.compose.foundation.shape.RoundedCornerShape(topEnd = 16.dp, bottomEnd = 16.dp)
            ) {
                Spacer(Modifier.height(24.dp))
                
                // Profile Section (Premium Hub) - Moved to TOP
                Spacer(Modifier.height(12.dp))

                Spacer(Modifier.height(16.dp))
                
                Column(
                    modifier = Modifier
                        .verticalScroll(rememberScrollState())
                        .weight(1f)
                ) {
                    for (item in navItems) {
                        NavigationDrawerItem(
                            label = { Text(item.title, fontWeight = if (navController.currentBackStackEntryAsState().value?.destination?.route == item.route) FontWeight.Bold else FontWeight.Normal) },
                            icon = { Icon(item.icon, contentDescription = null) },
                            selected = navController.currentBackStackEntryAsState().value?.destination?.route == item.route,
                            onClick = {
                                scope.launch { drawerState.close() }
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                            colors = NavigationDrawerItemDefaults.colors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                unselectedTextColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        )
                    }
                }
                
                Spacer(Modifier.height(16.dp))
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))

                // Profile Section (Premium Hub) - Moved to BOTTOM
                Surface(
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)),
                    onClick = { 
                        navController.navigate("profile") {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                        scope.launch { drawerState.close() }
                    }
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box {
                            AsyncImage(
                                model = profileImage ?: "https://ui-avatars.com/api/?name=${name?.ifBlank { "User" }?.replace(" ", "+") ?: "User"}&background=random",
                                contentDescription = "Profile Image",
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                                contentScale = ContentScale.Crop,
                                error = rememberAsyncImagePainter("https://ui-avatars.com/api/?name=User&background=random")
                            )
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF22C55E))
                                    .border(1.5.dp, MaterialTheme.colorScheme.surface, CircleShape)
                                    .align(Alignment.BottomEnd)
                            )
                        }
                        
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (name.isNullOrBlank()) "User" else name!!,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1
                            )
                            Surface(
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = (role ?: "Student").uppercase(),
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
                
                Spacer(Modifier.height(8.dp))

                // App Settings (Manual Pin)
                NavigationDrawerItem(
                    label = { Text("App Settings") },
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    selected = navController.currentBackStackEntryAsState().value?.destination?.route == "app_settings",
                    onClick = { 
                        scope.launch { drawerState.close() }
                        navController.navigate("app_settings") {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    colors = NavigationDrawerItemDefaults.colors(
                        unselectedIconColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        unselectedTextColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                )

                Spacer(Modifier.height(8.dp))
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                Spacer(Modifier.height(8.dp))

                NavigationDrawerItem(
                    label = { Text("Logout") },
                    icon = { Icon(Icons.Default.Logout, contentDescription = null) },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        onLogout()
                    },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    colors = NavigationDrawerItemDefaults.colors(
                        unselectedIconColor = MaterialTheme.colorScheme.error,
                        unselectedTextColor = MaterialTheme.colorScheme.error
                    )
                )
                Spacer(Modifier.height(16.dp))
            }
        }
    ) {
        Scaffold(
            topBar = {
                val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
                val title = navItems.find { it.route == currentRoute }?.title ?: "Apex"
                
                CenterAlignedTopAppBar(
                    title = { Text(title, fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(imageVector = Icons.Default.Menu, contentDescription = "Menu")
                        }
                    },
                    actions = {
                        IconButton(onClick = { navController.navigate("chatbot") }) {
                            Icon(imageVector = Icons.Default.Face, contentDescription = "AI")
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                    )
                )
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = "dashboard",
                modifier = Modifier.padding(innerPadding)
            ) {
                composable("dashboard") {
                    com.attendance.app.ui.dashboard.DashboardScreen(
                        onNavigateAttendance = { studentId -> /* Handle navigation */ },
                        onNavigateSessions = { navController.navigate("sessions") },
                        onNavigateChatbot = { navController.navigate("chatbot") },
                        onNavigateAssessments = { navController.navigate("assessments") },
                        onNavigatePerformance = { navController.navigate("performance") },
                        onNavigateProfile = { navController.navigate("profile") },
                        onNavigateApprovals = { navController.navigate("approvals") },
                        onNavigateIoT = { navController.navigate("iot") },
                        onNavigateMobileScanner = { navController.navigate("mobile_scanner") },
                        onNavigateSessionReport = { sessionId -> navController.navigate("session_report/$sessionId") },
                        onNavigateSettings = { navController.navigate("app_settings") },
                        onNavigateHierarchy = { navController.navigate("hierarchy_management") },
                        onNavigateManagement = { navController.navigate("management") },
                        onNavigateMonitoring = { navController.navigate("monitoring") }
                    )
                }
                
                composable("chatbot") { com.attendance.app.ui.chatbot.ChatbotScreen(onBack = { navController.popBackStack() }) }
                composable("mobile_scanner") { com.attendance.app.ui.nfc.NfcScannerScreen(onBack = { navController.popBackStack() }) }
                composable("approvals") { com.attendance.app.ui.onboarding.OnboardingScreen(onBack = { navController.popBackStack() }) }
                composable("iot") { com.attendance.app.ui.iot.IoTScreen(onBack = { navController.popBackStack() }) }
                composable("management") { 
                    com.attendance.app.ui.management.ManagementHubScreen(
                        onBack = { navController.popBackStack() },
                        onNavigateStudents = { navController.navigate("students") },
                        onNavigateDoctors = { navController.navigate("doctors") },
                        onNavigateAdmins = { navController.navigate("admins") },
                        onNavigateHierarchy = { navController.navigate("hierarchy_management") },
                        onNavigateCourses = { navController.navigate("course_management") }
                    )
                }
                composable("students") {
                    com.attendance.app.ui.management.StudentsScreen(
                        onBack = { navController.popBackStack() },
                        onNavigateProfile = { id -> navController.navigate("student_profile/$id") }
                    )
                }
                composable(
                    route = "student_profile/{studentId}",
                    arguments = listOf(navArgument("studentId") { type = NavType.IntType })
                ) { backStackEntry ->
                    val id = backStackEntry.arguments?.getInt("studentId") ?: 0
                    com.attendance.app.ui.profile.StudentProfileScreen(
                        studentId = id,
                        onBack = { navController.popBackStack() }
                    )
                }
                composable("doctors") {
                    com.attendance.app.ui.management.DoctorsScreen(
                        onBack = { navController.popBackStack() },
                        onNavigateProfile = { id -> navController.navigate("doctor_profile/$id") }
                    )
                }
                composable(
                    route = "doctor_profile/{doctorId}",
                    arguments = listOf(navArgument("doctorId") { type = NavType.IntType })
                ) { backStackEntry ->
                    val id = backStackEntry.arguments?.getInt("doctorId") ?: 0
                    com.attendance.app.ui.profile.DoctorProfileScreen(
                        doctorId = id,
                        onBack = { navController.popBackStack() }
                    )
                }
                composable("admins") {
                    com.attendance.app.ui.management.AdminsScreen(
                        onBack = { navController.popBackStack() }
                    )
                }
                composable("user_management") {
                    com.attendance.app.ui.management.UserManagementScreen(onBack = { navController.popBackStack() })
                }
                composable("hierarchy_management") {
                    com.attendance.app.ui.management.HierarchyManagementScreen(onBack = { navController.popBackStack() })
                }
                composable("course_management") {
                    com.attendance.app.ui.courses.CourseManagementScreen(
                        onBack = { navController.popBackStack() },
                        onNavigateToGradebook = { id -> navController.navigate("gradebook/$id") }
                    )
                }
                composable("sessions") { 
                    com.attendance.app.ui.session.SessionsScreen(
                        onBack = { navController.popBackStack() },
                        onNavigateCreateSession = { navController.navigate("create_session") }
                    ) 
                }
                composable("create_session") {
                    com.attendance.app.ui.sessions.CreateSessionScreen(onBack = { navController.popBackStack() })
                }
                composable("session_report/{sessionId}") { 
                    com.attendance.app.ui.session.SessionReportScreen(
                        onBack = { navController.popBackStack() }
                    )
                }
                composable("assessments") { 
                    com.attendance.app.ui.assessments.AssessmentsScreen(
                        role = role ?: "student",
                        onBack = { navController.popBackStack() },
                        onNavigateToGradebook = { id -> navController.navigate("gradebook/$id") },
                        onNavigateToPerformance = { navController.navigate("performance") }
                    ) 
                }
                composable("gradebook/{assessmentId}") {
                    com.attendance.app.ui.gradebook.GradebookScreen(
                        onBack = { navController.popBackStack() }
                    )
                }
                composable("performance") { com.attendance.app.ui.performance.PerformanceScreen(onBack = { navController.popBackStack() }) }
                composable("profile") { 
                    com.attendance.app.ui.profile.ProfileScreen(
                        onBack = { navController.popBackStack() },
                        onLogout = onLogout,
                        onNavigatePerformance = { navController.navigate("performance") }
                    ) 
                }
                composable("monitoring") {
                    com.attendance.app.ui.dashboard.MonitoringDashboardScreen(
                        onBack = { navController.popBackStack() }
                    )
                }

                composable("app_settings") {
                    com.attendance.app.ui.settings.AppSettingsScreen(
                        onBack = { navController.popBackStack() },
                        tokenStore = tokenStore,
                        wifiHelper = wifiHelper
                    )
                }
            }
        }
    }
}
