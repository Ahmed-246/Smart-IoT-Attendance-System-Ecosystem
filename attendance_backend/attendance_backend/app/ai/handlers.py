from app.ai.llm_handler import aria_engine
from app.ai.knowledge_base import (
    SOVEREIGN_KNOWLEDGE, OPERATIONS_KNOWLEDGE, 
    ACADEMIC_KNOWLEDGE, TECHNICAL_KNOWLEDGE, STUDENT_KNOWLEDGE
)

async def handle_social(intent: str, context: dict, question: str = "") -> str:
    """Delegates all social interactions to the SLM."""
    return await aria_engine.generate_response(question, context)

async def handle_sovereign(intent: str, context: dict, question: str = "") -> str:
    """Delegates Sovereign (Super Admin) logic to the SLM."""
    context["system_policies"] = SOVEREIGN_KNOWLEDGE
    return await aria_engine.generate_response(question, context)

async def handle_operations(intent: str, context: dict, question: str = "") -> str:
    """Delegates Operations (Admin) logic to the SLM."""
    context["system_policies"] = OPERATIONS_KNOWLEDGE
    return await aria_engine.generate_response(question, context)

async def handle_academic(intent: str, context: dict, question: str = "") -> str:
    """Delegates Academic (Doctor) logic to the SLM."""
    context["system_policies"] = ACADEMIC_KNOWLEDGE
    return await aria_engine.generate_response(question, context)

async def handle_technical(intent: str, context: dict, question: str = "") -> str:
    """Delegates Technical (Engineer) logic to the SLM."""
    context["system_policies"] = TECHNICAL_KNOWLEDGE
    return await aria_engine.generate_response(question, context)

async def handle_student(intent: str, context: dict, question: str = "") -> str:
    """Delegates Student logic to the SLM."""
    if not context:
        return "I couldn't find your student record. Please contact the registrar."
    context["system_policies"] = STUDENT_KNOWLEDGE
    return await aria_engine.generate_response(question, context)
