import asyncio
import httpx

BASE_URL = "http://localhost:8000"

async def verify():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Login
        login_res = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@iot.com", "password": "Admin@1234"}
        )
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login OK")

        # Test Date Filters
        print("\n=== DATE FILTER TEST ===")
        logs_res = await client.get(
            f"{BASE_URL}/api/monitoring/logs?start_date=2026-04-20T00:00&end_date=2026-04-22T00:00", 
            headers=headers
        )
        print(f"Status (Range Filter): {logs_res.status_code}")
        if logs_res.status_code == 200:
            print(f"Returned {len(logs_res.json()['logs'])} logs.")
        
        # Test Logout explicit call
        print("\n=== explicitly calling /auth/logout ===")
        logout_res = await client.post(
            f"{BASE_URL}/api/auth/logout",
            headers=headers
        )
        print(f"Logout status: {logout_res.status_code}")
        
        # Verify the session is logged out
        logs2_res = await client.get(
            f"{BASE_URL}/api/monitoring/logs?limit=5", 
            headers=headers
        )
        if logs2_res.status_code == 200:
            ldata = logs2_res.json()
            for l in ldata['logs'][:3]:
                if l['action_type'] == 'LOGIN':
                    print(f"Session {l['session_id'][:8]}... status is: {l.get('session_status')}")
                    break

if __name__ == "__main__":
    asyncio.run(verify())
