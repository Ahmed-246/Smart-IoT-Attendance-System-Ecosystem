"""
PostgreSQL migration script for Grade Book Dashboard & Academic Archive.
Adds new columns to enrollments, academic_records, and creates term_config table.
Run: python migrate_gradebook_archive.py
"""
import asyncio
import asyncpg
from app.core.config import get_settings

settings = get_settings()

# Extract connection details from async URL
# postgresql+asyncpg://postgres:admin@localhost:5432/attendance_db -> postgresql://postgres:admin@localhost:5432/attendance_db
DB_URL = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


async def migrate():
    conn = await asyncpg.connect(DB_URL)

    print("[MIGRATE] Starting Grade Book Dashboard & Academic Archive migration...")

    # ═══════════════════════════════════════════════════════════
    # 1. Add columns to enrollments table
    # ═══════════════════════════════════════════════════════════
    enrollment_columns = [
        ("is_current", "BOOLEAN NOT NULL DEFAULT TRUE"),
        ("semester_snapshot", "INTEGER"),
        ("final_percentage", "DOUBLE PRECISION"),
        ("result", "VARCHAR(30)"),
    ]

    for col_name, col_def in enrollment_columns:
        try:
            await conn.execute(f"ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS {col_name} {col_def}")
            print(f"  [OK] Added enrollments.{col_name}")
        except Exception as e:
            print(f"  [SKIP] enrollments.{col_name}: {e}")

    # Handle unique constraint change
    # Drop old constraint if it exists
    try:
        await conn.execute("ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS uq_student_course")
        print("  [OK] Dropped old uq_student_course constraint")
    except Exception as e:
        print(f"  [SKIP] Drop old constraint: {e}")

    # Create new compound constraint (won't error if already exists)
    try:
        await conn.execute("""
            DO $$ BEGIN
                ALTER TABLE enrollments ADD CONSTRAINT uq_student_course_year_sem 
                UNIQUE (student_id, course_id, academic_year_snapshot, semester_snapshot);
            EXCEPTION WHEN duplicate_table THEN
                NULL;
            END $$;
        """)
        print("  [OK] Added uq_student_course_year_sem constraint")
    except Exception as e:
        print(f"  [SKIP] New constraint: {e}")

    # ═══════════════════════════════════════════════════════════
    # 2. Add columns to academic_records table
    # ═══════════════════════════════════════════════════════════
    record_columns = [
        ("academic_year_label", "VARCHAR(50)"),
        ("year_level", "INTEGER"),
        ("result_type", "VARCHAR(30)"),
    ]

    for col_name, col_def in record_columns:
        try:
            await conn.execute(f"ALTER TABLE academic_records ADD COLUMN IF NOT EXISTS {col_name} {col_def}")
            print(f"  [OK] Added academic_records.{col_name}")
        except Exception as e:
            print(f"  [SKIP] academic_records.{col_name}: {e}")

    # ═══════════════════════════════════════════════════════════
    # 3. Create term_config table
    # ═══════════════════════════════════════════════════════════
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS term_config (
                id INTEGER PRIMARY KEY DEFAULT 1,
                academic_year_label VARCHAR(50) NOT NULL DEFAULT '2025/2026',
                current_year_start INTEGER NOT NULL DEFAULT 2025,
                current_semester INTEGER NOT NULL DEFAULT 1,
                is_locked BOOLEAN NOT NULL DEFAULT FALSE
            )
        """)
        print("  [OK] Created term_config table")
    except Exception as e:
        print(f"  [SKIP] term_config: {e}")

    # Seed default row if empty
    count = await conn.fetchval("SELECT COUNT(*) FROM term_config")
    if count == 0:
        await conn.execute("""
            INSERT INTO term_config (id, academic_year_label, current_year_start, current_semester, is_locked)
            VALUES (1, '2025/2026', 2025, 1, FALSE)
        """)
        print("  [OK] Seeded default term_config row")

    await conn.close()
    print("[MIGRATE] Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(migrate())
