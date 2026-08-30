import asyncio
from app.db.database import engine, Base
# Import all models to register with Base
from app.models import (
    user, student, instructor, doctor, faculty, department, 
    course, enrollment, grade, session, attendance, device, associations,
    assessment, grade_result, academic_record
)

async def run_reset():
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset complete.")

if __name__ == "__main__":
    asyncio.run(run_reset())
