from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.schemas import AIQuery, AIResponse
from app.core.security import get_current_user

from app.ai.intent_engine import resolve_intent, suggest_intents
from app.ai.intents import (
    SOVEREIGN_INTENTS, OPERATIONS_INTENTS,
    ACADEMIC_INTENTS, TECHNICAL_INTENTS, STUDENT_INTENTS
)
from app.ai.context_fetchers import (
    fetch_sovereign_context, fetch_operations_context,
    fetch_academic_context, fetch_technical_context, fetch_student_context
)
from app.ai.handlers import (
    handle_sovereign, handle_operations,
    handle_academic, handle_technical, handle_student
)

router = APIRouter(prefix="/ai", tags=["AI Chatbot"])

ROLE_REGISTRY = {
    "super_admin": {"intents": SOVEREIGN_INTENTS, "fetcher": fetch_sovereign_context, "handler": handle_sovereign, "persona": "Sovereign"},
    "admin":       {"intents": OPERATIONS_INTENTS, "fetcher": fetch_operations_context, "handler": handle_operations, "persona": "Operations"},
    "doctor":      {"intents": ACADEMIC_INTENTS, "fetcher": fetch_academic_context, "handler": handle_academic, "persona": "Academic"},
    "engineer":    {"intents": TECHNICAL_INTENTS, "fetcher": fetch_technical_context, "handler": handle_technical, "persona": "Technical"},
    "student":     {"intents": STUDENT_INTENTS, "fetcher": fetch_student_context, "handler": handle_student, "persona": "Personal"},
}

@router.post("/query", response_model=AIResponse)
async def ai_query(
    payload: AIQuery,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Session Check (10 message limit)
    if payload.message_count >= 10:
        return AIResponse(
            answer="⏱️ You've reached the 10-message limit for this session. Please close and reopen the AI Assistant to start fresh.",
            session_expired=True,
            remaining_messages=0
        )

    role = current_user.get("role", "student")
    config = ROLE_REGISTRY.get(role, ROLE_REGISTRY["student"])
    
    # 2. Intent Resolution
    intent, confidence = resolve_intent(payload.question, config["intents"])
    
    # 3. Handle Generation
    # 4. Context Fetching
    if role == "student":
        context = await config["fetcher"](db, current_user.get("sub"))
    elif role in ["doctor", "engineer"]:
        context = await config["fetcher"](db, current_user.get("user_id"))
    else:
        context = await config["fetcher"](db)

    # 5. Response Generation
    answer = await config["handler"](intent, context, payload.question)
    
    # 6. Append Suggestions to Text
    intent_data = config["intents"].get(intent, {})
    follow_ups = intent_data.get("follow_ups", [])
    if follow_ups:
        answer += "\n\n**Suggested next steps:**\n" + "\n".join([f"• {s}" for s in follow_ups])
    
    return AIResponse(
        answer=answer,
        intent=intent,
        confidence=confidence,
        persona=config["persona"],
        remaining_messages=10 - (payload.message_count + 1),
        suggestions=follow_ups if follow_ups else None
    )
