
import asyncio
import os
import sys
from sqlalchemy import update
from app.db.database import AsyncSessionLocal
from app.models.user import User

async def run():
    async with AsyncSessionLocal() as db:
        await db.execute(update(User).where(User.email == 'admin@school.edu').values(phone_number='01066806475'))
        await db.commit()
        print('Success: Admin phone updated to 01066806475')

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(run())
