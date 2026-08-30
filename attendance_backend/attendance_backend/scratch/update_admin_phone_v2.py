
import asyncio
import os
import sys
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def run():
    async with AsyncSessionLocal() as db:
        # Using raw SQL to avoid ORD mapper initialization issues
        await db.execute(text("UPDATE users SET phone_number = '01066806475' WHERE email = 'admin@school.edu'"))
        await db.commit()
        print('Success: Admin phone updated to 01066806475 via raw SQL')

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(run())
