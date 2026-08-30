
import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def check_data():
    async with AsyncSessionLocal() as db:
        res_s = await db.execute(text("SELECT COUNT(*) FROM sessions"))
        s_count = res_s.scalar()
        
        res_a = await db.execute(text("SELECT COUNT(*) FROM attendance"))
        a_count = res_a.scalar()
        
        print(f"DEBUG_SESSIONS_COUNT: {s_count}")
        print(f"DEBUG_ATTENDANCE_COUNT: {a_count}")

if __name__ == "__main__":
    asyncio.run(check_data())
