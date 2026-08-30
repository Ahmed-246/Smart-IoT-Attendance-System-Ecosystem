import asyncio
from app.db.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        for table in ['students', 'system_activities', 'pre_verified_students', 'users']:
            print(f"\n--- {table.upper()} TABLE ---")
            res = await conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'"))
            for r in res.fetchall():
                print(f"{r[0]}: {r[1]}")

if __name__ == "__main__":
    asyncio.run(check())
