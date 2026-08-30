
import asyncio
import os
import sys
from sqlalchemy import select

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.database import AsyncSessionLocal
from app.ai.llm_handler import aria_engine
from app.ai.context_fetchers import (
    fetch_operations_context, 
    fetch_academic_context, 
    fetch_student_context
)
from app.models.user import User
from app.models.doctor import Doctor
from app.models.student import Student

async def test_role(role_name, context_fetcher, db, extra_arg=None):
    print(f"\n--- TESTING ROLE: {role_name} ---")
    if extra_arg:
        context = await context_fetcher(db, extra_arg)
    else:
        context = await context_fetcher(db)
    
    # Debug what is being sent
    minified = aria_engine._minify_context(context)
    print(f"[CONTEXT SENT]: {minified}")
    
    questions = [
        "Who am I and what is my role?",
        "What is the current system status or my performance?",
        "How many students are in the system or my classes?"
    ]
    
    for q in questions:
        print(f"\n[USER]: {q}")
        response = await aria_engine.generate_response(q, context)
        print(f"[ARIA]: {response}")

async def run_multi_role_test():
    async with AsyncSessionLocal() as db:
        # 1. Admin Test
        await test_role("Admin", fetch_operations_context, db)
        
        # 2. Doctor Test (Fetch a real doctor id)
        dr = (await db.execute(select(Doctor))).scalar()
        if dr:
            await test_role("Doctor", fetch_academic_context, db, dr.id)
            
        # 3. Student Test (Fetch a real student email)
        st = (await db.execute(select(Student))).scalar()
        if st:
            await test_role("Student", fetch_student_context, db, st.email)

if __name__ == "__main__":
    asyncio.run(run_multi_role_test())
