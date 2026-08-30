
import asyncio
import os
import sys
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT email, phone_number FROM users"))
        users = res.all()
        print("--- Users in DB ---")
        for u in users:
            print(f"Email: {u[0]} | Phone: '{u[1]}'")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(check())
