package com.attendance.app.ui.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.attendance.app.R
import kotlinx.coroutines.delay

@Composable
fun AppSplashScreen(onFinished: () -> Unit) {
    var startAnimation by remember { mutableStateOf(false) }
    
    // Royal Reveal Animation Suite
    val alphaAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
        label = "AlphaAnimation"
    )
    
    val scaleAnim by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0.8f,
        animationSpec = tween(durationMillis = 1500, easing = OvershootInterpolator(1.2f).toEasing()),
        label = "ScaleAnimation"
    )

    LaunchedEffect(Unit) {
        startAnimation = true
        delay(2800) // Optimal duration for professional brand recognition
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .alpha(alphaAnim)
                .scale(scaleAnim)
        ) {
            Image(
                painter = painterResource(id = R.mipmap.ic_launcher_otu_foreground),
                contentDescription = null,
                modifier = Modifier.size(160.dp)
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "جامعة ٦ أكتوبر التكنولوجية",
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF1A237E)
            )
            Text(
                text = "6 OCTOBER TECHNOLOGICAL UNIVERSITY",
                fontSize = 14.sp,
                color = Color.Gray.copy(alpha = 0.8f),
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
        }
    }
}

// Helper to convert Interpolator to Easing
fun OvershootInterpolator(tension: Float = 2f): android.view.animation.Interpolator = 
    android.view.animation.OvershootInterpolator(tension)

fun android.view.animation.Interpolator.toEasing() = Easing { x ->
    getInterpolation(x)
}
