import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check_enum():
    async with engine.connect() as conn:
        # Check ActivityAction values
        result = await conn.execute(text("SELECT n.nspname as schema, t.typname as type, e.enumlabel as value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'activityaction'"))
        print("ActivityAction Enum values in DB:")
        for row in result:
            print(f"- {row.value}")

        # Check ActivityPriority values
        result = await conn.execute(text("SELECT n.nspname as schema, t.typname as type, e.enumlabel as value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'activitypriority'"))
        print("\nActivityPriority Enum values in DB:")
        for row in result:
            print(f"- {row.value}")

if __name__ == "__main__":
    asyncio.run(check_enum())
