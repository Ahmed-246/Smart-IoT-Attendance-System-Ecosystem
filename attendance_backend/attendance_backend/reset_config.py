import asyncio
from app.db.database import engine
from app.models.system_config import SystemConfig

async def reset():
    async with engine.begin() as conn:
        await conn.run_sync(SystemConfig.__table__.drop, checkfirst=True)
        await conn.run_sync(SystemConfig.__table__.create, checkfirst=True)

asyncio.run(reset())
