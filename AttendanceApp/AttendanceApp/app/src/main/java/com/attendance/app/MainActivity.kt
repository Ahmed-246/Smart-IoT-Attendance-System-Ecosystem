package com.attendance.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import com.attendance.app.data.TokenStore
import com.attendance.app.ui.AppNavGraph
import com.attendance.app.ui.theme.AttendanceTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var tokenStore: TokenStore
    @Inject lateinit var wifiHelper: com.attendance.app.hardware.wifi.WifiHelper

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            val isDark by tokenStore.isDarkMode.collectAsState(initial = true)
            AttendanceTheme(darkTheme = isDark) {
                AppNavGraph(tokenStore = tokenStore, wifiHelper = wifiHelper)
            }
        }
    }
}
