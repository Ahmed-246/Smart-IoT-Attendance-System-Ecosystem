
import asyncio
from sqlalchemy import select
from app.db.database import AsyncSessionLocal, engine
from app.models.device import Device

async def check_devices():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Device))
        devices = result.scalars().all()
        print(f"Total devices: {len(devices)}")
        for d in devices:
            print(f"ID: {d.id}, MAC: {d.mac_address}, Name: {d.device_name}, Active: {d.is_active}")

if __name__ == "__main__":
    asyncio.run(check_devices())
