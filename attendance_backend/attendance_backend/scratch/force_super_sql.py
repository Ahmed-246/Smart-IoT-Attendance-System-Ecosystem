import asyncio
import os
import sys
from sqlalchemy import text

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.database import AsyncSessionLocal

async def force_superadmin():
    async with AsyncSessionLocal() as db:
        print("Executing direct SQL to update superadmin role...")
        await db.execute(text("UPDATE users SET role = 'super_admin' WHERE email = 'superadmin@iot.com'"))
        await db.commit()
        print("Successfully updated via SQL.")

if __name__ == "__main__":
    asyncio.run(force_superadmin())
