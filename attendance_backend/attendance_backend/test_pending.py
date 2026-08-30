
import asyncio
import httpx

async def check_pending():
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/iot/pending")
            print(f"Status: {resp.status_code}")
            print(f"Body: {resp.json()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_pending())
