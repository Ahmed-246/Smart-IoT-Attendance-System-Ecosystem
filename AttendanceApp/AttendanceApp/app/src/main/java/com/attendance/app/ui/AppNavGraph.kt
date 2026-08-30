package com.attendance.app.ui

import androidx.compose.runtime.*
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.attendance.app.data.TokenStore
import com.attendance.app.ui.attendance.AttendanceScreen
import com.attendance.app.ui.assessments.AssessmentsScreen
import com.attendance.app.ui.chatbot.ChatbotScreen
import com.attendance.app.ui.dashboard.DashboardScreen
import com.attendance.app.ui.login.LoginScreen
import com.attendance.app.ui.profile.ProfileScreen
import com.attendance.app.ui.session.SessionsScreen
import com.attendance.app.ui.gradebook.GradebookScreen
import com.attendance.app.ui.onboarding.OnboardingScreen
import com.attendance.app.ui.iot.IoTScreen
import com.attendance.app.ui.hierarchy.HierarchyScreen
import com.attendance.app.ui.intro.IntroScreen
import com.attendance.app.ui.session.SessionReportScreen
import com.attendance.app.ui.splash.AppSplashScreen

@Composable
fun AppNavGraph(
    tokenStore: TokenStore,
    wifiHelper: com.attendance.app.hardware.wifi.WifiHelper
) {
    val navController = rememberNavController()

    NavHost(
        navController = navController, 
        startDestination = Screen.Splash.route
    ) {
        // Masterpiece Entrance - Step 1: Cinematic Splash
        composable(Screen.Splash.route) {
            AppSplashScreen(
                onFinished = {
                    navController.navigate(Screen.Intro.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        // Masterpiece Entrance - Step 2: Branded Intro Hub
        composable(Screen.Intro.route) {
            IntroScreen(
                onContinue = {
                    // Safe session check before moving to app core
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Intro.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateRegister = {
                    navController.navigate(Screen.Register.route)
                },
                onNavigateForgotPassword = {
                    navController.navigate(Screen.ForgotPassword.route)
                }
            )
        }
        
        composable(Screen.ForgotPassword.route) {
            com.attendance.app.ui.login.ForgotPasswordScreen(
                onBackToLogin = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Register.route) {
            com.attendance.app.ui.register.RegistrationScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.AppSettings.route) {
            com.attendance.app.ui.settings.AppSettingsScreen(
                onBack = { navController.popBackStack() },
                tokenStore = tokenStore,
                wifiHelper = wifiHelper
            )
        }

        composable(Screen.Dashboard.route) {
            com.attendance.app.ui.navigation.RoleBasedNavigator(
                tokenStore = tokenStore,
                wifiHelper = wifiHelper,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Hierarchy.route) {
            HierarchyScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Screen.Attendance.route,
            arguments = listOf(navArgument("studentId") { type = NavType.IntType })
        ) {
            AttendanceScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Sessions.route) {
            SessionsScreen(
                onBack = { navController.popBackStack() },
                onNavigateCreateSession = { navController.navigate(Screen.CreateSession.route) }
            )
        }

        composable(Screen.CreateSession.route) {
            com.attendance.app.ui.sessions.CreateSessionScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Chatbot.route) {
            ChatbotScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Profile.route) {
            ProfileScreen(
                onBack = { navController.popBackStack() },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigatePerformance = { navController.navigate(Screen.Performance.route) }
            )
        }

        composable(Screen.Performance.route) {
            com.attendance.app.ui.performance.PerformanceScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.ManagementHub.route) {
            com.attendance.app.ui.management.ManagementHubScreen(
                onBack = { navController.popBackStack() },
                onNavigateStudents = { navController.navigate(Screen.Students.route) },
                onNavigateDoctors = { navController.navigate(Screen.Doctors.route) },
                onNavigateAdmins = { navController.navigate(Screen.Admins.route) },
                onNavigateHierarchy = { navController.navigate(Screen.HierarchyManagement.route) },
                onNavigateCourses = { navController.navigate(Screen.CourseManagement.route) }
            )
        }

        composable(Screen.Students.route) {
            com.attendance.app.ui.management.StudentsScreen(
                onBack = { navController.popBackStack() },
                onNavigateProfile = { id -> navController.navigate(Screen.StudentProfile.go(id)) }
            )
        }

        composable(
            route = Screen.StudentProfile.route,
            arguments = listOf(navArgument("studentId") { type = NavType.IntType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getInt("studentId") ?: 0
            com.attendance.app.ui.profile.StudentProfileScreen(
                studentId = id,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Doctors.route) {
            com.attendance.app.ui.management.DoctorsScreen(
                onBack = { navController.popBackStack() },
                onNavigateProfile = { id -> navController.navigate(Screen.DoctorProfile.go(id)) }
            )
        }

        composable(
            route = Screen.DoctorProfile.route,
            arguments = listOf(navArgument("doctorId") { type = NavType.IntType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getInt("doctorId") ?: 0
            com.attendance.app.ui.profile.DoctorProfileScreen(
                doctorId = id,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Admins.route) {
            com.attendance.app.ui.management.AdminsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.UserManagement.route) {
            com.attendance.app.ui.management.UserManagementScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.HierarchyManagement.route) {
            com.attendance.app.ui.management.HierarchyManagementScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.CourseManagement.route) {
            com.attendance.app.ui.courses.CourseManagementScreen(
                onBack = { navController.popBackStack() },
                onNavigateToGradebook = { id -> navController.navigate(Screen.Gradebook.go(id)) }
            )
        }

        composable(Screen.Assessments.route) {
            val role by tokenStore.role.collectAsState(initial = "student")
            AssessmentsScreen(
                role = role ?: "student",
                onBack = { navController.popBackStack() },
                onNavigateToGradebook = { id -> navController.navigate(Screen.Gradebook.go(id)) },
                onNavigateToPerformance = { navController.navigate(Screen.Performance.route) }
            )
        }

        composable(
            route = Screen.Gradebook.route,
            arguments = listOf(navArgument("assessmentId") { type = NavType.IntType })
        ) {
            GradebookScreen(onBack = { navController.popBackStack() })
        }
        
        composable(Screen.Approvals.route) {
            OnboardingScreen(onBack = { navController.popBackStack() })
        }
        
        composable(Screen.IoT.route) {
            IoTScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Screen.SessionReport.route,
            arguments = listOf(navArgument("sessionId") { type = NavType.IntType })
        ) {
            SessionReportScreen(onBack = { navController.popBackStack() })
        }
    }
}
