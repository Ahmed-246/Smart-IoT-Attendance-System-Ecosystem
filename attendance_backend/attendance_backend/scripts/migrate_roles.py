import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
)

async def migrate_roles():
    # Phase 1: Add ENUM values using AUTOCOMMIT (Postgres requires this for ALTER TYPE ADD VALUE)
    auto_engine = engine.execution_options(isolation_level="AUTOCOMMIT")
    async with auto_engine.begin() as conn:
        try:
            print("Adding 'doctor' and 'engineer' to Postgres user_role enum...")
            await conn.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'doctor'"))
        except Exception as e:
            print(f"Warning/Info: {e}")
            
        try:
            await conn.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'engineer'"))
        except Exception as e:
            print(f"Warning/Info: {e}")

    # Phase 2: Now that values are committed, run the UPDATEs
    async with engine.begin() as conn:
        print("Migrating doctors...")
        await conn.execute(text("""
            UPDATE users 
            SET role = 'doctor' 
            WHERE email IN (SELECT email FROM doctors) AND role = 'instructor'
        """))

        await conn.execute(text("""
            UPDATE users 
            SET role = 'doctor' 
            WHERE email IN (SELECT email FROM instructors WHERE title IN ('Dr.', 'Prof.')) AND role = 'instructor'
        """))

        print("Migrating remaining instructors to 'engineer'...")
        await conn.execute(text("""
            UPDATE users 
            SET role = 'engineer' 
            WHERE role = 'instructor'
        """))

        print("Migration complete!")


if __name__ == "__main__":
    asyncio.run(migrate_roles())
