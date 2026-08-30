import asyncio
import httpx
import sys

BASE_URL = "http://localhost:8000"

async def verify_monitoring():
    async with httpx.AsyncClient() as client:
        # 1. Login as super_admin (assuming seed data)
        try:
            login_res = await client.post(f"{BASE_URL}/auth/login", json={
                "email": "shadlence@gmail.com",
                "password": "Password123!"
            })
            if login_res.status_code != 200:
                print(f"❌ Login failed: {login_res.text}")
                return
            
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Login successful")

            # 2. Check summary
            sum_res = await client.get(f"{BASE_URL}/monitoring/summary", headers=headers)
            if sum_res.status_code == 200:
                print(f"✅ Summary API working: {sum_res.json()}")
            else:
                print(f"❌ Summary API failed: {sum_res.status_code} - {sum_res.text}")

            # 3. Check logs
            log_res = await client.get(f"{BASE_URL}/monitoring/logs", headers=headers, params={"limit": 5})
            if log_res.status_code == 200:
                print(f"✅ Logs API working, found {len(log_res.json()['logs'])} logs")
            else:
                print(f"❌ Logs API failed: {log_res.status_code} - {log_res.text}")

        except Exception as e:
            print(f"❌ Verification error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_monitoring())
