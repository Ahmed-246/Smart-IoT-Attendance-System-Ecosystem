import asyncio
from app.ai.intent_engine import resolve_intent
from app.ai.intents import STUDENT_INTENTS
from app.ai.handlers import handle_student

async def test_social():
    print("--- 🧠 Testing ARIA v2 Social Logic ---")
    
    questions = ["hi", "how are you?", "who am i?", "what can you do?"]
    
    for q in questions:
        intent, conf = resolve_intent(q, STUDENT_INTENTS)
        resp = handle_student(intent, {"name": "Test User", "rate": 85})
        
        # Simulate the orchestrator appending suggestions
        follow_ups = STUDENT_INTENTS[intent].get("follow_ups", [])
        if follow_ups:
            resp += "\n\n**Suggested next steps:**\n" + "\n".join([f"• {s}" for s in follow_ups])
            
        print(f"\nQuestion: {q}")
        print(f"Intent: {intent} (Conf: {conf})")
        print(f"Response:\n{resp}")

if __name__ == "__main__":
    asyncio.run(test_social())
