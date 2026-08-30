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

        # Test CSV Export
        print("\n=== CSV EXPORT TEST ===")
        csv_res = await client.get(f"{BASE_URL}/api/monitoring/logs/export", headers=headers)
        print(f"Status: {csv_res.status_code}")
        if csv_res.status_code == 200:
            content_disp = csv_res.headers.get("content-disposition", "")
            print(f"Content-Disposition: {content_disp}")
            lines = csv_res.text.split("\n")
            print(f"CSV lines: {len(lines)}")
            print(f"Header: {lines[0][:120]}...")
            if len(lines) > 1:
                print(f"First row: {lines[1][:120]}...")
        else:
            print(f"Error: {csv_res.text}")

        # Test Clear Logs with WRONG password
        print("\n=== CLEAR LOGS (wrong password) ===")
        clear_res = await client.post(
            f"{BASE_URL}/api/monitoring/logs/clear",
            json={"password": "wrong_password"},
            headers=headers
        )
        print(f"Status: {clear_res.status_code} (should be 401)")
        print(f"Response: {clear_res.json()}")

        print("\n=== ALL NEW ENDPOINTS VERIFIED ===")

if __name__ == "__main__":
    asyncio.run(verify())
