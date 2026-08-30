package com.attendance.app.ui.login

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.auth.ForgotPasswordViewModel

@Composable
fun ForgotPasswordScreen(
    onBackToLogin: () -> Unit,
    vm: ForgotPasswordViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070707)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Header
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "RESET PASSWORD",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    letterSpacing = 2.sp
                )
                Text(
                    if (state.step == 1) "Enter your phone number to receive a token" else "Enter your token and new password",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.5f),
                    textAlign = TextAlign.Center
                )
            }

            // Glass Container
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.White.copy(alpha = 0.03f))
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (state.step == 1) {
                    GlassTextField(
                        value = state.phone,
                        onValueChange = { vm.clearError(); vm.updatePhone(it) },
                        label = "Phone Number",
                        icon = Icons.Default.Phone,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { vm.requestResetToken() })
                    )
                } else {
                    GlassTextField(
                        value = state.token,
                        onValueChange = { vm.clearError(); vm.updateToken(it) },
                        label = "Token (from SMS)",
                        icon = Icons.Default.VpnKey,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = ImeAction.Next)
                    )
                    GlassTextField(
                        value = state.newPassword,
                        onValueChange = { vm.clearError(); vm.updateNewPassword(it) },
                        label = "New Password",
                        icon = Icons.Default.Lock,
                        isPassword = true,
                        passwordVisible = true, // To avoid making it too complex, just let them see the new password
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { vm.resetPassword(onSuccess = onBackToLogin) })
                    )
                }
            }

            // Debug Token
            if (state.debugToken != null && state.step == 2) {
                Text(
                    "[DEBUG] Your token is: ${state.debugToken}",
                    color = Color.Yellow.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.labelSmall
                )
            }

            // Error & Success Message
            AnimatedVisibility(visible = state.error != null || state.successMsg != null) {
                val msg = state.error ?: state.successMsg
                val color = if (state.error != null) Color(0xFFEF4444) else Color(0xFF10B981)
                if (msg != null) {
                    Text(
                        msg,
                        color = color,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 12.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            // Action Button
            Button(
                onClick = { if (state.step == 1) vm.requestResetToken() else vm.resetPassword(onBackToLogin) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                contentPadding = PaddingValues(0.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = !state.isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF8B5CF6)))),
                    contentAlignment = Alignment.Center
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp, color = Color.White)
                    } else {
                        Text(if (state.step == 1) "SEND TOKEN" else "RESET PASSWORD", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
            
            TextButton(onClick = onBackToLogin) {
                Text("Back to Login", color = Color.White.copy(alpha = 0.4f), style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}
