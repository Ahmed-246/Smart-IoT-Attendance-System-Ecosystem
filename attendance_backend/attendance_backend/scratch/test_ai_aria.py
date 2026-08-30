import asyncio
import httpx
from app.core.security import create_access_token
from datetime import timedelta

async def test_ai():
    # Mock user payloads
    users = [
        {"sub": "superadmin@iot.com", "role": "super_admin", "user_id": 1, "name": "Sovereign Admin"},
        {"sub": "admin@school.edu", "role": "admin", "user_id": 2, "name": "Ops Admin"},
        {"sub": "student@test.com", "role": "student", "user_id": 3, "name": "Test Student"}
    ]
    
    url = "http://localhost:8000/api/ai/query"
    
    for u in users:
        token = create_access_token(data=u, expires_delta=timedelta(minutes=5))
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test specific question
        q = "What is the system status?" if u["role"] == "super_admin" else "Tell me about my attendance."
        
        print(f"\n--- Testing Role: {u['role']} ---")
        print(f"Question: {q}")
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json={"question": q, "message_count": 0}, headers=headers)
                data = resp.json()
                print(f"Persona: {data.get('persona')}")
                print(f"Intent: {data.get('intent')} (Confidence: {data.get('confidence')})")
                print(f"Answer: {data.get('answer')}")
                print(f"Remaining: {data.get('remaining_messages')}/10")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ai())
