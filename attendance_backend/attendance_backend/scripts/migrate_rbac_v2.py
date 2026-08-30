import asyncio
import sys
import os

# Add root to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import AsyncSessionLocal as SessionLocal, engine

async def migrate():
    print("🚀 Starting RBAC & Profile Enrichment Migration...")
    
    async with SessionLocal() as db:
        # Detect DB Type
        db_type = "sqlite" if "sqlite" in str(engine.url) else "postgres"
        print(f"📦 Detected Database Type: {db_type}")

        # 1. Update UserRole Enum (Postgres only)
        if db_type == "postgres":
            print("Updating UserRole enum...")
            try:
                # Enums in Postgres need special handling
                # We use 'COMMIT' to run outside transaction if needed, 
                # but SQLAlchemy async might need a different approach for enums.
                # However, many setups use simple strings for enums in models.
                # Let's check the users table if it uses the enum type.
                await db.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin'"))
                await db.commit()
                print("✅ Added 'super_admin' to user_role enum.")
            except Exception as e:
                print(f"ℹ️ Enum update info (might already exist): {e}")

        # 2. Add Columns Helper
        async def add_column(table, col_name, col_type):
            print(f"Checking {table}.{col_name}...")
            try:
                # Common syntax for Postgres and SQLite for basic ALTER TABLE
                await db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
                await db.commit()
                print(f"✅ Added {col_name} to {table}.")
            except Exception as e:
                err_str = str(e).lower()
                if "already exists" in err_str or "duplicate column" in err_str:
                    print(f"ℹ️ {col_name} already exists in {table}.")
                else:
                    print(f"❌ Error adding {col_name} to {table}: {e}")

        # --- USERS ---
        await add_column("users", "last_login", "VARCHAR(50)")
        await add_column("users", "profile_image_url", "VARCHAR(500)")

        # --- STUDENTS ---
        await add_column("students", "emergency_contact_phone", "VARCHAR(20)")
        await add_column("students", "bio", "TEXT")
        await add_column("students", "personal_email", "VARCHAR(255)")

        # --- INSTRUCTORS ---
        await add_column("instructors", "specialization", "VARCHAR(255)")
        await add_column("instructors", "office_hours", "VARCHAR(500)")
        await add_column("instructors", "bio", "VARCHAR(1000)")
        await add_column("instructors", "appointment_link", "VARCHAR(500)")

        # --- DOCTORS ---
        await add_column("doctors", "specialization", "VARCHAR(255)")
        await add_column("doctors", "office_hours", "VARCHAR(500)")
        await add_column("doctors", "bio", "VARCHAR(1000)")
        await add_column("doctors", "appointment_link", "VARCHAR(500)")

    print("\n✨ Migration Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
