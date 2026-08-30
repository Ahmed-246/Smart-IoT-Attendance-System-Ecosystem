import asyncio
import json
from app.db.database import AsyncSessionLocal
from app.api.routes.gradebook_dashboard import get_gradebook_report

async def debug_report():
    async with AsyncSessionLocal() as db:
        print("[DEBUG] Testing Gradebook Report API...")
        try:
            # Simulate the API call
            # We need to mock current_user
            mock_user = {"id": 1, "role": "super_admin"}
            
            # Call with some parameters that should return data
            # Faculty 1, Dept 1, Year 1 (from our seed)
            response = await get_gradebook_report(
                faculty_id=1, 
                department_id=1, 
                year_level=1,
                page=1,
                page_size=10, 
                db=db, 
                current_user=mock_user
            )
            print("[DEBUG] Response success!")
            print(json.dumps(response, indent=2)[:500] + "...")
        except Exception as e:
            import traceback
            print("[DEBUG] Report generation FAILED!")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_report())
