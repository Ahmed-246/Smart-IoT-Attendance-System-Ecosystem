import asyncio
from app.db.database import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        print("Adding session_id to system_activities...")
        try:
            await conn.execute(text("ALTER TABLE system_activities ADD COLUMN session_id VARCHAR(255);"))
        except Exception as e:
            print("session_id might already exist:", e)

    async with engine.begin() as conn:
        print("Creating session_telemetry table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS session_telemetry (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                action_type VARCHAR(50) NOT NULL,
                path VARCHAR(255),
                description VARCHAR(500),
                details_json JSONB
            );
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_session_telemetry_session_id ON session_telemetry (session_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_session_telemetry_timestamp ON session_telemetry (timestamp);"))
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
