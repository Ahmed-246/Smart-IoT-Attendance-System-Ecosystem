import asyncio
import traceback
from app.db.database import AsyncSessionLocal
from app.api.routes.academic import get_university_readiness

async def debug_audit():
    async with AsyncSessionLocal() as db:
        print("[DEBUG] Triggering Academic Readiness Audit...")
        try:
            # Mock user
            mock_user = {"sub": "admin@school.edu", "role": "super_admin"}
            response = await get_university_readiness(db=db, current_user=mock_user)
            print("[DEBUG] Audit Success!")
            # print(response)  # Might be very large
        except Exception as e:
            print("[DEBUG] Audit FAILED!")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_audit())
