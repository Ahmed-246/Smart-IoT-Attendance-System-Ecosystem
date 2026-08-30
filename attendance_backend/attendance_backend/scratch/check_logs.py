import asyncio
from app.db.database import engine
from sqlalchemy import text

async def check_db():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM system_activities;"))
        print(f"Total system_activities: {res.scalar()}")
        
        res = await conn.execute(text("SELECT id, user_role, action_type, priority, timestamp FROM system_activities ORDER BY timestamp DESC LIMIT 5;"))
        for r in res.fetchall():
            print(r)
            
        res2 = await conn.execute(text("SELECT COUNT(*) FROM session_telemetry;"))
        print(f"Total session_telemetry: {res2.scalar()}")
        
        res2 = await conn.execute(text("SELECT * FROM session_telemetry ORDER BY timestamp DESC LIMIT 3;"))
        for r in res2.fetchall():
            print(r)

if __name__ == "__main__":
    asyncio.run(check_db())
