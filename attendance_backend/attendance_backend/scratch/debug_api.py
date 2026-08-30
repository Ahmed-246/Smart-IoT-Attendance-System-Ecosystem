import asyncio
import httpx
import json

async def check_api():
    base_url = "http://localhost:8000"
    
    # 1. Login to get token
    async with httpx.AsyncClient() as client:
        login_res = await client.post(f"{base_url}/auth/login", json={
            "email": "superadmin@iot.com",
            "password": "Admin@1234"
        })
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code}")
            print(login_res.text)
            return
            
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Call students endpoint
        students_res = await client.get(f"{base_url}/admin/students", headers=headers)
        print(f"GET /admin/students: {students_res.status_code}")
        if students_res.status_code != 200:
            print(students_res.text)
            
        # 3. Call history endpoint (the one shown in screenshot failing)
        history_res = await client.get(f"{base_url}/admin/students/history", headers=headers, params={"status": "APPROVED"})
        print(f"GET /admin/students/history: {history_res.status_code}")
        if history_res.status_code != 200:
            print(history_res.text)

if __name__ == "__main__":
    asyncio.run(check_api())
