package com.attendance.app.ui.chatbot

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.app.ui.components.GlassCard
import com.attendance.app.ui.theme.AriaGlowBrush
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val SUGGESTIONS = listOf(
    "Who is absent today?",
    "How many active sessions are there?",
    "What is today's attendance rate?",
    "Show me pending students."
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatbotScreen(
    onBack: () -> Unit,
    vm: ChatbotViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            scope.launch {
                delay(100)
                listState.animateScrollToItem(state.messages.size - 1)
            }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFA855F7).copy(alpha = 0.1f), modifier = Modifier.size(36.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(imageVector = Icons.Default.AutoAwesome, contentDescription = null, tint = Color(0xFFA855F7), modifier = Modifier.size(20.dp))
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("ARIA v2", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                            Text(if (state.isThinking) "ENGINE THINKING..." else "BUILT-IN INTELLIGENCE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) }
                },
                actions = {
                    Box(modifier = Modifier.padding(end = 8.dp)) {
                        val limit = state.remainingMessages?.let { state.messageCount + it } ?: 10
                        Text("${state.messageCount}/$limit", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), style = MaterialTheme.typography.labelSmall)
                    }
                    IconButton(onClick = vm::clearChat) { Icon(imageVector = Icons.Default.Refresh, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)) }
                }
            )
        },
        bottomBar = {
            if (!state.isSessionExpired) {
                ChatInput(
                    value = state.input,
                    onValueChange = vm::onInputChange,
                    onSend = { vm.send() },
                    isThinking = state.isThinking
                )
            } else {
                SessionExpiredMessage(onRestart = vm::clearChat)
            }
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(state.messages, key = { it.id }) { msg ->
                ChatBubble(message = msg)
            }

            if (!state.isThinking && !state.isSessionExpired && state.suggestions.isNotEmpty()) {
                item {
                    SuggestionRow(
                        suggestions = state.suggestions.map { s ->
                            s.replace("Did you mean: ", "").replace("?", "")
                        },
                        onSelect = { q ->
                            vm.send(q)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun SessionExpiredMessage(onRestart: () -> Unit) {
    Surface(
        color = Color(0xFFEF4444).copy(alpha = 0.1f),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.padding(16.dp).fillMaxWidth(),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.2f))
    ) {
        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("⏱️ Session Complete", color = Color(0xFFFCA5A5), fontWeight = FontWeight.Bold)
            Text("10-message limit reached. Restart to continue.", color = Color(0xFFF87171).copy(alpha = 0.7f), style = MaterialTheme.typography.labelSmall)
            Spacer(Modifier.height(12.dp))
            Button(onClick = onRestart, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))) {
                Text("Start New Session")
            }
        }
    }
}

@Composable
private fun ChatBubble(message: ChatMessage) {
    var isVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        isVisible = true
    }

    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically(initialOffsetY = { it / 2 }) + fadeIn(tween(300)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (message.isUser) Arrangement.End else Arrangement.Start
        ) {
            if (!message.isUser) {
                Surface(
                    shape = CircleShape,
                    color = Color(0xFF3B82F6).copy(alpha = 0.1f),
                    modifier = Modifier.size(32.dp).align(Alignment.Bottom)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(imageVector = Icons.Default.SmartToy, contentDescription = null, tint = Color(0xFF3B82F6), modifier = Modifier.size(18.dp))
                    }
                }
                Spacer(Modifier.width(8.dp))
            }

            val bubbleColor = if (message.isUser) MaterialTheme.colorScheme.primary else Color.Transparent
            val textColor = if (message.isUser) MaterialTheme.colorScheme.onPrimary else Color.White
            val shape = if (message.isUser)
                RoundedCornerShape(18.dp, 4.dp, 18.dp, 18.dp)
            else
                RoundedCornerShape(4.dp, 18.dp, 18.dp, 18.dp)

            Column(horizontalAlignment = if (message.isUser) Alignment.End else Alignment.Start) {
                if (!message.isUser && (message.persona != null || message.confidence != null)) {
                    Row(
                        modifier = Modifier.padding(bottom = 4.dp, start = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (message.persona != null) {
                            Text(message.persona.uppercase(), style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), fontWeight = FontWeight.Bold)
                        }
                        if (message.persona != null && message.confidence != null) {
                            Text(" • ", style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                        }
                        if (message.confidence != null) {
                            Text("CONF: ${(message.confidence * 100).toInt()}%", style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Box(
                    modifier = Modifier
                        .widthIn(max = 280.dp)
                        .clip(shape)
                        .then(
                            if (message.isUser) Modifier.background(bubbleColor)
                            else Modifier.background(AriaGlowBrush)
                        )
                        .padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    if (message.isLoading) {
                        ThinkingDots()
                    } else {
                        Text(parseMarkdown(message.text), style = MaterialTheme.typography.bodyMedium, color = textColor)
                    }
                }
            }
        }
    }
}

@Composable
private fun ThinkingDots() {
    val infiniteTransition = rememberInfiniteTransition(label = "dots")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 0.8f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )
    
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
        repeat(3) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = alpha))
            )
            Spacer(Modifier.width(4.dp))
        }
    }
}
@Composable
private fun SuggestionRow(
    suggestions: List<String>,
    onSelect: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Try asking:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f), modifier = Modifier.padding(start = 4.dp))
        suggestions.forEach { q ->
            GlassCard(modifier = Modifier.fillMaxWidth().clickable { onSelect(q) }) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = Icons.Default.Lightbulb, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(q, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                }
            }
        }
    }
}

@Composable
private fun ChatInput(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    isThinking: Boolean
) {
    Surface(color = Color.Transparent, modifier = Modifier.padding(16.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            TextField(
                value = value,
                onValueChange = onValueChange,
                placeholder = { Text("Ask Intelligence...", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)) },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(24.dp),
                maxLines = 3,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { if (!isThinking) onSend() }),
                enabled = !isThinking,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                    unfocusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                )
            )
            FloatingActionButton(
                onClick = { if (value.isNotBlank() && !isThinking) onSend() },
                containerColor = if (value.isNotBlank() && !isThinking) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                modifier = Modifier.size(48.dp),
                shape = CircleShape
            ) {
                Icon(if (isThinking) Icons.Default.HourglassEmpty else Icons.AutoMirrored.Filled.Send, null, tint = if (value.isNotBlank() && !isThinking) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
            }
        }
    }
}

private fun parseMarkdown(text: String): AnnotatedString {
    return buildAnnotatedString {
        val parts = text.split("**")
        for (i in parts.indices) {
            if (i % 2 == 1) {
                withStyle(style = SpanStyle(fontWeight = FontWeight.Bold)) {
                    append(parts[i])
                }
            } else {
                append(parts[i])
            }
        }
    }
}
