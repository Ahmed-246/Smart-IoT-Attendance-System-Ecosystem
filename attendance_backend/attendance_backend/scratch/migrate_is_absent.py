import asyncio
from sqlalchemy import text
from app.db.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Adding column 'is_absent' to 'grade_results' table...")
        try:
            await conn.execute(text("ALTER TABLE grade_results ADD COLUMN is_absent BOOLEAN DEFAULT FALSE"))
            print("Migration successful.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column 'is_absent' already exists.")
            else:
                print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
