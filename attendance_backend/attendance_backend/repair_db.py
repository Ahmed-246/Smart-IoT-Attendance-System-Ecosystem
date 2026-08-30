import asyncio
from app.db.database import engine
from sqlalchemy import text

async def repair():
    async with engine.begin() as conn:
        print("[REPAIR] Starting Postgres schema synchronization...")
        
        # 1. Ensure Enum types exist (standard models often define these)
        # academic_status_enum: ACTIVE, PROBATION, REPEATER, DISMISSED, GRADUATED
        # approval_status_enum: PENDING, APPROVED, REJECTED
        
        # 2. Monitoring - System Activities
        queries = [
            "ALTER TABLE system_activities ADD COLUMN IF NOT EXISTS user_avatar VARCHAR(500)",
            "ALTER TABLE system_activities ADD COLUMN IF NOT EXISTS details_json JSONB"
        ]
        
        # 3. Students Table
        queries.extend([
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS university_id VARCHAR(50)",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_status VARCHAR(50) DEFAULT 'ACTIVE'",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'PENDING'",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS rejected_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS approved_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500)",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS id_card_image_url VARCHAR(500)",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20)",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS bio TEXT",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255)"
        ])
        
        # 4. Pre-Verified Students Table
        queries.extend([
            "ALTER TABLE pre_verified_students ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)",
            "ALTER TABLE pre_verified_students ADD COLUMN IF NOT EXISTS faculty_id INTEGER",
            "ALTER TABLE pre_verified_students ADD COLUMN IF NOT EXISTS academic_year INTEGER",
            "ALTER TABLE pre_verified_students ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL"
        ])
        
        # 5. Users enrichment
        queries.extend([
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_password_hash VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500)"
        ])

        # 6. Term Config enrichment
        queries.extend([
            "ALTER TABLE term_config ADD COLUMN IF NOT EXISTS system_logo_url VARCHAR(500)",
            "ALTER TABLE term_config ADD COLUMN IF NOT EXISTS academic_year_label VARCHAR(100)",
            "ALTER TABLE term_config ADD COLUMN IF NOT EXISTS current_year_start TIMESTAMP WITH TIME ZONE"
        ])

        for q in queries:
            try:
                await conn.execute(text(q))
                print(f"SUCCESS: {q}")
            except Exception as e:
                # On Postgres, ADD COLUMN IF NOT EXISTS is 9.6+, 
                # but if it fails we just catch it (usually means column already exists if not 9.6+)
                print(f"SKIPPED/FAILED: {q} | Error: {e}")

        print("[REPAIR] Schema synchronization complete.")

if __name__ == "__main__":
    asyncio.run(repair())
