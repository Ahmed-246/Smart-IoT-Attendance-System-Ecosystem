import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def verify():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("Logging in...")
        # 1. Login as Super Admin
        login_res = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@iot.com", "password": "Admin@1234"}
        )
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code} {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")

        # 2. Fetch Monitoring Logs
        print("Fetching monitoring logs...")
        logs_res = await client.get(f"{BASE_URL}/api/monitoring/logs", headers=headers)
        print(f"Logs response status: {logs_res.status_code}")
        if logs_res.status_code == 200:
            data = logs_res.json()
            print(f"Total reported: {data.get('total')}")
            print(f"Number of logs in array: {len(data.get('logs', []))}")
            if data.get('logs'):
                print("First log snippet:")
                print(json.dumps(data['logs'][0], indent=2))
        else:
            print(f"Logs fetch failed: {logs_res.text}")

if __name__ == "__main__":
    asyncio.run(verify())
