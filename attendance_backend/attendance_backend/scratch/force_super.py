import asyncio
from app.db.database import AsyncSessionLocal
from app.models.user import User, UserRole
from sqlalchemy import select

async def force_superadmin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "superadmin@iot.com"))
        user = result.scalar_one_or_none()
        if user:
            print(f"Found user {user.email} with role {user.role}. Updating to super_admin...")
            user.role = UserRole.super_admin
            await db.commit()
            print("Successfully updated.")
        else:
            print("User not found.")

if __name__ == "__main__":
    asyncio.run(force_superadmin())
