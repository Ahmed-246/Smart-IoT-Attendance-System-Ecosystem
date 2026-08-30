import asyncio
from app.ai.intent_engine import resolve_intent
from app.ai.intents import (
    SOVEREIGN_INTENTS, OPERATIONS_INTENTS,
    ACADEMIC_INTENTS, TECHNICAL_INTENTS, STUDENT_INTENTS
)
from app.ai.handlers import (
    handle_sovereign, handle_operations,
    handle_academic, handle_technical, handle_student
)
from app.ai.context_fetchers import fetch_student_context
from app.db.database import get_db, AsyncSession
from sqlalchemy import select
from app.models.student import Student

async def test_direct():
    print("--- 🧠 Testing ARIA v2 Logic Directly ---")
    
    # 1. Test Intent Engine
    test_q = "my attendnce rate" # with typo
    intent, conf = resolve_intent(test_q, STUDENT_INTENTS)
    print(f"Intent Match: '{test_q}' -> {intent} (Confidence: {conf})")
    
    # 2. Test Handler (Sovereign)
    mock_sov_ctx = {
        "health": 95.5,
        "active_users": 12,
        "recent_logs": ["LOGIN by admin", "LOCKDOWN toggle"]
    }
    resp = handle_sovereign("system_status", mock_sov_ctx)
    print(f"\nSovereign Response: {resp}")
    
    # 3. Test Student Logic (Fetch context)
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from app.core.config import get_settings
        settings = get_settings()
        engine = create_async_engine(settings.DATABASE_URL)
        async with engine.connect() as conn:
            async with AsyncSession(engine) as db:
                # Find a student email
                res = await db.execute(select(Student.email).limit(1))
                email = res.scalar()
                if email:
                    print(f"\nFetching context for: {email}")
                    ctx = await fetch_student_context(db, email)
                    print(f"Student Context: {ctx}")
                    
                    s_resp = handle_student("my_attendance", ctx)
                    print(f"Student AI Response: {s_resp}")
                else:
                    print("\nNo students found in DB to test context fetch.")
    except Exception as e:
        print(f"\nDB Fetch Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_direct())
