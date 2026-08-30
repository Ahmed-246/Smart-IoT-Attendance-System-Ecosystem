from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any

from app.db.database import get_db, engine
from app.core.security import require_super_admin
from app.models.system_config import SystemConfig
from app.services.system_service import generate_database_backup, purge_audit_logs

router = APIRouter()

@router.get("/config")
async def get_system_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemConfig).limit(1))
    config = result.scalars().first()
    if not config:
        config = SystemConfig()
        db.add(config)
        await db.commit()
    return config

@router.patch("/config")
async def update_system_config(
    updates: Dict[str, Any], 
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_super_admin)
):
    result = await db.execute(select(SystemConfig).limit(1))
    config = result.scalars().first()
    if not config:
        config = SystemConfig()
        db.add(config)
    
    for key, value in updates.items():
        if hasattr(config, key):
            setattr(config, key, value)
            
    await db.commit()
    return config

@router.post("/lockdown")
async def toggle_lockdown(db: AsyncSession = Depends(get_db), user: dict = Depends(require_super_admin)):
    result = await db.execute(select(SystemConfig).limit(1))
    config = result.scalars().first()
    if not config:
        config = SystemConfig()
        db.add(config)
        
    config.is_locked = not config.is_locked
    await db.commit()
    return {"message": "Lockdown toggled", "is_locked": config.is_locked}

@router.get("/backup")
async def download_backup(db: AsyncSession = Depends(get_db), user: dict = Depends(require_super_admin)):
    zip_buffer = await generate_database_backup(db)
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": "attachment; filename=Sovereign_Database_Backup.zip"}
    )

@router.post("/cache/clear")
async def clear_cache(user: dict = Depends(require_super_admin)):
    # Flush SQLAlchemy engine pool connections to reset state
    await engine.dispose()
    return {"message": "Transient cache cleared. ORM engine disposed and re-initialized."}

@router.delete("/audit/purge")
async def purge_logs(db: AsyncSession = Depends(get_db), user: dict = Depends(require_super_admin)):
    await purge_audit_logs(db)
    return {"message": "Audit logs purged successfully."}

@router.get("/metrics")
async def get_system_metrics(db: AsyncSession = Depends(get_db), user: dict = Depends(require_super_admin)):
    import psutil
    import os
    from sqlalchemy import text
    
    # Check Database Connection
    db_connected = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_connected = False

    # Get System RAM usage
    ram = psutil.virtual_memory()
    ram_used_gb = ram.used / (1024 ** 3)
    ram_total_gb = ram.total / (1024 ** 3)
    ram_percent = ram.percent
    
    # Get ONLY this App's RAM usage
    process = psutil.Process(os.getpid())
    app_ram_mb = process.memory_info().rss / (1024 * 1024)
    
    # Get CPU usage
    cpu_percent = psutil.cpu_percent(interval=0.1)

    # Get PM2 Stats (if available)
    import subprocess
    import json
    pm2_stats = {"restarts": 0, "status": "NOT FOUND"}
    try:
        # Running 'pm2 jlist' gets a JSON list of all processes
        process = subprocess.run(["pm2", "jlist"], capture_output=True, text=True, shell=True)
        if process.returncode == 0:
            data = json.loads(process.stdout)
            restarts = sum(p.get('pm2_env', {}).get('restart_time', 0) for p in data)
            pm2_stats = {"restarts": restarts, "status": "ACTIVE"}
    except Exception:
        pass
    
    return {
        "ram_used_gb": round(ram_used_gb, 1),
        "ram_total_gb": round(ram_total_gb, 1),
        "ram_percent": ram_percent,
        "app_ram_mb": round(app_ram_mb, 1),
        "cpu_percent": cpu_percent,
        "db_connected": db_connected,
        "pm2": pm2_stats
    }

