import asyncio
import sys
import os

# Add current directory to path so it can find app/
sys.path.append(os.getcwd())

from app.db.database import engine, Base, init_db
from sqlalchemy import text
import app.models  # Load ALL models into metadata

async def super_reset():
    print('[RESET] Starting super reset...')
    
    async with engine.begin() as conn:
        # 1. Aggressive drop: drop the entire public schema and recreate it
        # This clears all tables, views, types, etc.
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        print('[RESET] Public schema dropped and recreated.')

    # 2. Re-initialize tables
    await init_db()
    print('[RESET] Schema re-initialized.')

    # Verify column existence
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'instructors';"))
        cols = [r[0] for r in res.fetchall()]
        print(f'[VERIFY] Instructors columns: {cols}')
        
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'students';"))
        cols = [r[0] for r in res.fetchall()]
        print(f'[VERIFY] Students columns: {cols}')

if __name__ == '__main__':
    asyncio.run(super_reset())
