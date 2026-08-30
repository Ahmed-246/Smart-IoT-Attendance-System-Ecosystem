package com.attendance.app.ui.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.app.data.repository.AttendanceRepository
import com.attendance.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val text: String,
    val isUser: Boolean,
    val isLoading: Boolean = false,
    val persona: String? = null,
    val confidence: Double? = null,
    val intent: String? = null
)

data class ChatbotUiState(
    val messages: List<ChatMessage> = listOf(
        ChatMessage(
            text = "Hi! I'm ARIA v2 — your Academic Intelligence Assistant. How can I help you today?",
            isUser = false
        )
    ),
    val input: String = "",
    val isThinking: Boolean = false,
    val messageCount: Int = 0,
    val remainingMessages: Int? = null,
    val isSessionExpired: Boolean = false,
    val suggestions: List<String> = emptyList()
)

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    private val repo: AttendanceRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ChatbotUiState())
    val state = _state.asStateFlow()

    fun onInputChange(v: String) {
        if (!_state.value.isSessionExpired) {
            _state.update { it.copy(input = v) }
        }
    }

    fun send(questionOverride: String? = null) {
        val question = questionOverride ?: _state.value.input.trim()
        if (question.isBlank() || _state.value.isThinking || _state.value.isSessionExpired) return

        val userMsg = ChatMessage(text = question, isUser = true)
        val thinkingMsg = ChatMessage(text = "...", isUser = false, isLoading = true)

        _state.update {
            it.copy(
                messages = it.messages + userMsg + thinkingMsg,
                input = "",
                isThinking = true
            )
        }

        viewModelScope.launch {
            val res = repo.askAI(question, _state.value.messageCount)
            _state.update { state ->
                val reply = when (res) {
                    is Result.Success -> res.data.answer
                    is Result.Error   -> "Sorry, I couldn't reach the server. ${res.message}"
                    else -> "Unexpected error."
                }
                
                val expired = if (res is Result.Success) res.data.sessionExpired else false
                val count = if (res is Result.Success) state.messageCount + 1 else state.messageCount
                val rem = if (res is Result.Success) res.data.remainingMessages else state.remainingMessages
                val suggestions = if (res is Result.Success) res.data.suggestions ?: emptyList() else emptyList()
                
                val p = if (res is Result.Success) res.data.persona else null
                val conf = if (res is Result.Success) res.data.confidence else null
                val intentStr = if (res is Result.Success) res.data.intent else null
                
                val updated = state.messages.dropLast(1) +
                    ChatMessage(
                        text = reply, 
                        isUser = false, 
                        persona = p, 
                        confidence = conf, 
                        intent = intentStr
                    )
                    
                state.copy(
                    messages = updated, 
                    isThinking = false, 
                    messageCount = count,
                    remainingMessages = rem,
                    isSessionExpired = expired,
                    suggestions = suggestions
                )
            }
        }
    }

    fun clearChat() {
        _state.update {
            ChatbotUiState()
        }
    }
}
