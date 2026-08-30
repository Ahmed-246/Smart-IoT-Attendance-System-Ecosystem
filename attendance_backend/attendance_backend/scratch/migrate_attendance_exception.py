import asyncio
from sqlalchemy import text
from app.db.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Adding column 'attendance_exception' to 'enrollments' table...")
        try:
            await conn.execute(text("ALTER TABLE enrollments ADD COLUMN attendance_exception BOOLEAN DEFAULT FALSE"))
            print("Migration successful.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column 'attendance_exception' already exists.")
            else:
                print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
