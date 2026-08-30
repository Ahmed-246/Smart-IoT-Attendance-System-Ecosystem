import asyncio
import json
from app.db.database import AsyncSessionLocal
from sqlalchemy.future import select
from app.models.student import Student
from app.api.routes.gradebook_dashboard import get_gradebook_report

async def debug_exhaustive():
    async with AsyncSessionLocal() as db:
        print("[DEBUG] Exhaustive Gradebook Report Test...")
        
        # 1. Get all departments
        from app.models.department import Department
        depts_res = await db.execute(select(Department))
        depts = depts_res.scalars().all()
        
        for dept in depts:
            print(f"[DEBUG] Testing Dept: {dept.name} (ID: {dept.id})")
            mock_user = {"id": 1, "role": "super_admin"}
            
            for yr in range(1, 7):
                try:
                    response = await get_gradebook_report(
                        department_id=dept.id,
                        year_level=yr,
                        page=1,
                        page_size=10,
                        db=db,
                        current_user=mock_user
                    )
                    count = len(response.get("students", []))
                    if count > 0:
                        print(f"  - Year {yr}: Success ({count} students)")
                except Exception as e:
                    import traceback
                    print(f"  - Year {yr}: FAILED!")
                    traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_exhaustive())
