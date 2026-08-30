package com.attendance.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ─── Core Colors (Visual DNA) ───────────────────────────────────────────────
val MosulBlue = Color(0xFF1A237E)
val MosulGold = Color(0xFFFFD600)
val OledBlack = Color(0xFF000000)
val SlateGray = Color(0xFF1E293B)
val LightBackground = Color(0xFFF8FAFC)
val LightSurface = Color(0xFFFFFFFF)

// ─── Premium Brushes (AI & Glassmorphism) ──────────────────────────────────
val AriaGlowBrush = androidx.compose.ui.graphics.Brush.linearGradient(
    colors = listOf(Color(0xFF6366F1), Color(0xFFA855F7))
)

val GlassBorderBrush = androidx.compose.ui.graphics.Brush.linearGradient(
    colors = listOf(Color.White.copy(alpha = 0.2f), Color.Transparent)
)

// ─── Theme Colors ───────────────────────────────────────────────────
private val LightColorScheme = lightColorScheme(
    primary = MosulBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE8EAF6), // Light indigo tint
    onPrimaryContainer = MosulBlue,
    secondary = MosulGold,
    onSecondary = Color.Black,
    secondaryContainer = Color(0xFFFFFDE7),
    onSecondaryContainer = Color(0xFFF57F17),
    background = Color(0xFFF8FAFC),
    surface = Color(0xFFFFFFFF),
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF334155),
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF64748B),
    error = Color(0xFFEF4444)
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF7986CB), // Lighter indigo for dark mode contrast
    onPrimary = Color.White,
    primaryContainer = MosulBlue,
    onPrimaryContainer = Color.White,
    secondary = MosulGold,
    onSecondary = Color.Black,
    background = OledBlack,
    surface = SlateGray,
    onBackground = Color.White,
    onSurface = Color(0xFFF1F5F9),
    error = Color(0xFFF87171)
)

// ─── Typography ───────────────────────────────────────────────
val AppTypography = Typography(
    displayLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 32.sp, letterSpacing = (-0.5).sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 24.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 16.sp),
    bodyLarge = TextStyle(fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.Medium, fontSize = 14.sp, letterSpacing = 0.1.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.5.sp),
)

@Composable
fun AttendanceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
