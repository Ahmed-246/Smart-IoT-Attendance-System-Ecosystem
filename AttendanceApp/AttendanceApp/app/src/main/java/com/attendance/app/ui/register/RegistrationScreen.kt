package com.attendance.app.ui.register

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.login.GlassTextField

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegistrationScreen(
    onBack: () -> Unit,
    vm: RegistrationViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    val context = LocalContext.current

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri -> vm.onImageSelected(uri) }

    Scaffold(
        containerColor = Color(0xFF070707),
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
                title = { Text("Registration", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.White) }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier.fillMaxSize().padding(padding).background(Color(0xFF070707)),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier.size(300.dp).offset(x = 100.dp, y = -150.dp)
                    .background(Brush.radialGradient(listOf(Color(0xFF8B5CF6).copy(alpha = 0.15f), Color.Transparent)))
            )

            Column(
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Step Indicator
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    repeat(3) { index ->
                        val step = index + 1
                        val active = state.step >= step
                        val color = if (active) Color(0xFF3B82F6) else Color.White.copy(alpha = 0.2f)
                        Box(modifier = Modifier.size(if (active) 12.dp else 8.dp).clip(CircleShape).background(color))
                    }
                }
                
                Spacer(Modifier.height(16.dp))

                AnimatedVisibility(visible = state.step == 1) {
                    StepOneEmail(state, vm)
                }
                
                AnimatedVisibility(visible = state.step == 2) {
                    StepTwoToken(state, vm)
                }
                
                AnimatedVisibility(visible = state.step == 3) {
                    StepThreeDetails(state, vm) { galleryLauncher.launch("image/*") }
                }

                AnimatedVisibility(visible = state.step == 4) {
                    StepFourSuccess(onBack)
                }

                state.error?.let {
                    Text(it, color = Color(0xFFEF4444), style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center)
                }

                if (state.step < 4) {
                    Button(
                        onClick = {
                            when (state.step) {
                                1 -> vm.initiateRegistration()
                                2 -> vm.verifyToken()
                                3 -> vm.submitRegistration(context)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        enabled = !state.isLoading,
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF8B5CF6)))),
                            contentAlignment = Alignment.Center
                        ) {
                            if (state.isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                            else Text(if (state.step == 3) "SUBMIT" else "CONTINUE", style = MaterialTheme.typography.labelLarge, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StepOneEmail(state: RegistrationUiState, vm: RegistrationViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Academic Email", style = MaterialTheme.typography.titleMedium, color = Color.White)
        Text("Enter your university email to verify your identity.", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.5f))
        GlassTextField(
            value = state.email,
            onValueChange = { vm.updateField("email", it) },
            label = "name@university.edu",
            icon = Icons.Default.Email,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )
    }
}

@Composable
fun StepTwoToken(state: RegistrationUiState, vm: RegistrationViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Verification Code", style = MaterialTheme.typography.titleMedium, color = Color.White)
        Text("We sent a code to ${state.email}.", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.5f))
        GlassTextField(
            value = state.token,
            onValueChange = { vm.updateField("token", it.uppercase()) },
            label = "Enter 8-digit Code",
            icon = Icons.Default.VpnKey
        )
    }
}

@Composable
fun StepThreeDetails(state: RegistrationUiState, vm: RegistrationViewModel, onUploadClick: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Final Details", style = MaterialTheme.typography.titleMedium, color = Color.White)
        GlassTextField(state.name, { vm.updateField("name", it) }, "Full Name", Icons.Default.Person)
        GlassTextField(state.password, { vm.updateField("password", it) }, "Password", Icons.Default.Lock, isPassword = true)
        GlassTextField(state.phone, { vm.updateField("phone", it) }, "Phone Number", Icons.Default.Phone, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
        
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.weight(1f)) { GlassTextField(state.universityId, { vm.updateField("universityId", it) }, "Student ID", Icons.Default.Badge) }
            Box(Modifier.weight(1f)) { GlassTextField(state.academicYear, { vm.updateField("academicYear", it) }, "Year (e.g. 1)", Icons.Default.DateRange, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)) }
        }
        GlassTextField(state.departmentId, { vm.updateField("departmentId", it) }, "Department ID", Icons.Default.Business, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
        
        // ID Upload Box
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = Color.White.copy(alpha = 0.05f),
            modifier = Modifier.fillMaxWidth().height(80.dp).clickable { onUploadClick() },
            border = androidx.compose.foundation.BorderStroke(1.dp, if (state.idCardUri != null) Color(0xFF22C55E) else Color.White.copy(alpha = 0.1f))
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.Default.CameraAlt, contentDescription = null, tint = if (state.idCardUri != null) Color(0xFF22C55E) else Color.White)
                Spacer(Modifier.width(16.dp))
                Column {
                    Text("Upload University ID Card", color = Color.White, fontWeight = FontWeight.Bold)
                    Text(if (state.idCardUri != null) "Image selected" else "Tap to choose image", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun StepFourSuccess(onBack: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(80.dp))
        Text("Registration Complete!", style = MaterialTheme.typography.titleLarge, color = Color.White, fontWeight = FontWeight.Bold)
        Text("Your profile has been submitted. You will be able to log in once an Administrator verifies your ID.", 
            textAlign = TextAlign.Center, color = Color.White.copy(alpha = 0.6f))
            
        Spacer(Modifier.height(24.dp))
        Button(onClick = onBack, colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.1f))) {
            Text("Back to Login", color = Color.White)
        }
    }
}
