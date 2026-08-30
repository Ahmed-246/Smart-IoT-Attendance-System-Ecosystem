import asyncio
import sys
import os

# Add parent directory to path to find app module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import engine, Base
from app.models.device import Device

async def fix():
    print("Connecting to database...")
    async with engine.begin() as conn:
        # This will add missing columns if they don't exist
        await conn.run_sync(Base.metadata.create_all)
    print("Schema Updated successfully!")

if __name__ == "__main__":
    asyncio.run(fix())
