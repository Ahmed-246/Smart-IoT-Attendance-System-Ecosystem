import asyncio
from app.ai.intent_engine import resolve_intent
from app.ai.intents import OPERATIONS_INTENTS

async def test_suggestion_click():
    print("--- 🧠 Testing ARIA v2 Suggestion Resolution ---")
    
    # This was failing in the user's screenshot
    q = "Would you like to see a summary of your dashboard?"
    
    intent, conf = resolve_intent(q, OPERATIONS_INTENTS)
    
    print(f"\nClicked Suggestion: '{q}'")
    print(f"Resolved Intent: {intent}")
    print(f"Confidence: {conf}")
    
    if intent == "attendance_overview" and conf == 1.0:
        print("✅ SUCCESS: Suggestion resolved correctly!")
    else:
        print("❌ FAILURE: Suggestion failed to resolve.")

if __name__ == "__main__":
    asyncio.run(test_suggestion_click())
