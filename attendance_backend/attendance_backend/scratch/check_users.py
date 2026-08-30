
import asyncio
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.user import User

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User.email, User.phone_number))
        users = res.all()
        print("Users in DB:")
        for u in users:
            print(f"Email: {u.email} | Phone: '{u.phone_number}'")

if __name__ == "__main__":
    asyncio.run(check())
