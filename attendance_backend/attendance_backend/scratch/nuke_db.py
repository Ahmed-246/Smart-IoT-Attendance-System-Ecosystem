
import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.getcwd())
from app.db.database import AsyncSessionLocal

async def nuke():
    async with AsyncSessionLocal() as db:
        print("☢️  NUKING ALL TABLES...")
        # Get all table names
        res = await db.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
        tables = [r[0] for r in res.fetchall()]
        
        if tables:
            sql = f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE"
            await db.execute(text(sql))
            await db.commit()
            print(f"✅ Nuked {len(tables)} tables.")
        else:
            print("No tables found.")

if __name__ == "__main__":
    asyncio.run(nuke())
