
import asyncio
import os
import sys
import json

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.ai.llm_handler import aria_engine
from app.ai.context_fetchers import fetch_sovereign_context
from app.db.database import AsyncSessionLocal
from app.ai.knowledge_base import SOVEREIGN_KNOWLEDGE

async def run_stress_test():
    print("🚀 INITIALIZING ARIA NEURAL VERIFICATION STRESS TEST...")
    print("-" * 50)
    
    async with AsyncSessionLocal() as db:
        # 1. Fetch the REAL project context (God's-Eye View)
        print("📥 Fetching God's-Eye View context from Database...")
        context = await fetch_sovereign_context(db)
        context["system_policies"] = SOVEREIGN_KNOWLEDGE
        
        # 2. Define the Test Questions
        test_questions = [
            "How many students are in the system?",
            "Are there any active assessments right now?",
            "How do I grant a user permission for system monitoring?",
            "What is the current system health?",
            "How do I lock the system?",
            "How am I?", # Check casual hallucination fix
            "Who are the doctors?",
            "Tell me about a feature that doesn't exist like teleportation." # Check Kill Switch
        ]
        
        # 3. Execute queries
        for q in test_questions:
            debug_ctx = aria_engine._minify_context(context)
            print(f"\n[DEBUG CONTEXT SENT TO AI]:\n{debug_ctx}\n")
            print(f"[USER]: {q}")
            response = await aria_engine.generate_response(q, context)
            print(f"[ARIA]: {response}")
            print("-" * 30)

if __name__ == "__main__":
    # Ensure AI_URL is set for local ollama
    os.environ["AI_URL"] = "http://localhost:11434/api/generate"
    asyncio.run(run_stress_test())
