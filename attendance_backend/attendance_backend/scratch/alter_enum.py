import asyncio
from app.db.database import engine
from sqlalchemy import text

async def alter_enum():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TYPE activityaction ADD VALUE 'LOGOUT';"))
            print("Added LOGOUT to enum")
        except Exception as e:
            print("Enum might already have it or error:", e)

if __name__ == "__main__":
    asyncio.run(alter_enum())
