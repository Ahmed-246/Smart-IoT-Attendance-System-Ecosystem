from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import secrets

from app.db.database import get_db
from app.models.device import Device
from app.schemas.schemas import DeviceOut

router = APIRouter(prefix="/iot", tags=["IoT Provisioning"])

@router.post("/hello")
async def device_hello(
    mac: str = Query(..., description="MAC Address of the ESP32"),
    db: AsyncSession = Depends(get_db)
):
    """
    ESP32 calls this on boot. 
    If unknown, it adds to 'Pending' list.
    If known and active, returns 'ok'.
    """
    result = await db.execute(select(Device).where(Device.mac_address == mac))
    device = result.scalar_one_or_none()
    
    if not device:
        # First time seeing this hardware
        new_device = Device(
            mac_address=mac,
            device_name=f"New ESP ({mac[-5:]})",
            is_active=0, # Pending
            last_seen=datetime.now()
        )
        db.add(new_device)
        await db.commit()
        return {"status": "pending", "message": "Device recorded. Please claim it in the dashboard."}
    
    device.last_seen = datetime.now()
    await db.commit()
    
    if device.is_active == 1:
        return {"status": "active", "api_key": device.api_key}
    elif device.is_active == -1:
        return {"status": "blocked", "message": "This device has been decommissioned."}
    
    return {"status": "pending", "message": "Waiting for admin to claim this device."}

@router.get("/pending")
async def list_pending_devices(db: AsyncSession = Depends(get_db)):
    """Used by the dashboard to show the 'Nearby Devices' radar."""
    result = await db.execute(select(Device).where(Device.is_active == 0))
    return result.scalars().all()

@router.post("/claim/{device_id}")
async def claim_device(
    device_id: int,
    name: str,
    location: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Admin clicks 'Claim' on the dashboard."""
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    device.device_name = name
    device.location = location
    device.api_key = f"IOT_{secrets.token_urlsafe(24)}"
    device.is_active = 1
    
    await db.commit()
    return {"status": "success", "api_key": device.api_key}
