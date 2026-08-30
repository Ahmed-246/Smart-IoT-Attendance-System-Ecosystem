import asyncio
from app.db.database import engine
from sqlalchemy import text

async def dump_db():
    async with engine.connect() as conn:
        tables = ["faculties", "departments", "students", "users", "instructors", "doctors", "courses"]
        for table in tables:
            try:
                res = await conn.execute(text(f"SELECT * FROM {table} LIMIT 3"))
                print(f"\n--- {table} ---")
                rows = res.fetchall()
                if not rows:
                    print("EMPTY")
                else:
                    for row in rows:
                        print(row)
            except Exception as e:
                print(f"Error reading {table}: {e}")

if __name__ == "__main__":
    asyncio.run(dump_db())
