import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as c:
        r = await c.post("http://localhost:8000/api/auth/login", json={"email":"superadmin@iot.com","password":"Admin@1234"})
        token = r.json()["access_token"]
        r2 = await c.post("http://localhost:8000/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        print(f"Logout status: {r2.status_code}")
        print(f"Details: {r2.text}")

asyncio.run(test())
