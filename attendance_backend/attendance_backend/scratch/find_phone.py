
import asyncio
import os
import sys

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.user import User

async def find_user():
    async with AsyncSessionLocal() as db:
        # Check all users
        res = await db.execute(select(User.email, User.phone_number))
        users = res.all()
        print("--- All Users in Database ---")
        for email, phone in users:
            print(f"User: {email} | Phone: '{phone}'")
        
        # Check specifically for the number the user entered (cleaning spaces)
        clean_target = "01066806475"
        res = await db.execute(select(User).where(User.phone_number == clean_target))
        user = res.scalar_one_or_none()
        if user:
            print(f"\nFound match for '{clean_target}': {user.email}")
        else:
            print(f"\nNo exact match for '{clean_target}' (no spaces)")

if __name__ == "__main__":
    asyncio.run(find_user())
