from fastapi import APIRouter, Depends
from app.api.routes import auth, attendance, sessions, admin, ai, faculties, departments, assessments, gradebook, academic, gradebook_dashboard, archive, monitoring, admin_center, iot
from app.api.endpoints import system
from app.core.security import verify_system_lockdown

api_router = APIRouter()

# Mount routers with trailing slash handling
api_router.include_router(auth.router) # Auth must remain open for login

# Apply Sovereign Lockdown to all data routes
lockdown_dep = [Depends(verify_system_lockdown)]

api_router.include_router(attendance.router)
api_router.include_router(sessions.router, dependencies=lockdown_dep)
api_router.include_router(admin.router, dependencies=lockdown_dep)
api_router.include_router(ai.router, dependencies=lockdown_dep)
api_router.include_router(faculties.router)
api_router.include_router(departments.router)
api_router.include_router(assessments.router, dependencies=lockdown_dep)
api_router.include_router(gradebook.router, dependencies=lockdown_dep)
api_router.include_router(academic.router, dependencies=lockdown_dep)
api_router.include_router(gradebook_dashboard.router, dependencies=lockdown_dep)
api_router.include_router(archive.router, dependencies=lockdown_dep)
api_router.include_router(monitoring.router, dependencies=lockdown_dep)
api_router.include_router(admin_center.router, prefix="/admin-center", tags=["admin-center"], dependencies=lockdown_dep)
api_router.include_router(iot.router)
api_router.include_router(system.router, prefix="/system", tags=["system"])
