import asyncio
from sqlalchemy import text
from app.db.database import engine

async def add_columns():
    async with engine.begin() as conn:
        print("[MIGRATE] Adding phone_number columns to existing tables...")
        
        tables = ["users", "students", "instructors", "doctors"]
        
        for table in tables:
            try:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN phone_number VARCHAR(20)"))
                print(f"[MIGRATE] Added phone_number to {table}")
            except Exception as e:
                # Likely already exists
                print(f"[MIGRATE] Could not add column to {table} (it might already exist): {e}")
        
        await conn.commit()
    print("[MIGRATE] Column addition complete.")

if __name__ == "__main__":
    asyncio.run(add_columns())
