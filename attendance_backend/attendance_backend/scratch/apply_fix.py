import asyncio
from sqlalchemy import text
from app.db.database import engine

async def fix():
    async with engine.connect() as conn:
        await conn.execute(text("ALTER TYPE activityaction ADD VALUE 'LOGOUT'"))
        await conn.commit()
        print("Added LOGOUT to activityaction")

if __name__ == "__main__":
    asyncio.run(fix())
