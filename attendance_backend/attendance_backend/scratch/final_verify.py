import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def verify():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Login
        login_res = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@iot.com", "password": "Admin@1234"}
        )
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code} {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")

        # 2. Monitoring Summary
        print("\n=== MONITORING SUMMARY ===")
        summary_res = await client.get(f"{BASE_URL}/api/monitoring/summary", headers=headers)
        print(f"Status: {summary_res.status_code}")
        if summary_res.status_code == 200:
            data = summary_res.json()
            print(f"Total Logs: {data.get('total_logs', 0)}")
            print(f"Critical 24h: {data.get('critical_24h', 0)}")
            print(f"Warnings 24h: {data.get('warnings_24h', 0)}")
            print(f"Active Sessions: {data.get('active_sessions', 0)}")
            print(f"Recent Alerts: {len(data.get('recent_alerts', []))}")

        # 3. Monitoring Logs
        print("\n=== ACTIVITY LOGS (first 10) ===")
        logs_res = await client.get(f"{BASE_URL}/api/monitoring/logs?limit=10", headers=headers)
        print(f"Status: {logs_res.status_code}")
        if logs_res.status_code == 200:
            ldata = logs_res.json()
            print(f"Total: {ldata.get('total', 0)}")
            for l in ldata.get("logs", [])[:10]:
                desc = l["description"][:70]
                action = l["action_type"]
                role = l.get("user_role", "?")
                priority = l.get("priority", "?")
                print(f"  [{action:>10}] {desc:70s} | {role:>12} | {priority}")

        # 4. Create a new admin action and verify it appears in logs
        print("\n=== TEST: Create new audit log entry ===")
        students_res = await client.get(f"{BASE_URL}/api/admin/students?limit=1", headers=headers)
        if students_res.status_code == 200:
            stu_list = students_res.json()
            if len(stu_list) > 0:
                sid = stu_list[0]["id"]
                old_total = ldata.get("total", 0)
                
                # Update student bio
                upd = await client.put(
                    f"{BASE_URL}/api/admin/students/{sid}",
                    json={"bio": "Verified audit logging works"},
                    headers=headers
                )
                print(f"Update student {sid}: {upd.status_code}")
                
                # Re-check logs
                logs2_res = await client.get(f"{BASE_URL}/api/monitoring/logs?limit=3", headers=headers)
                ldata2 = logs2_res.json()
                new_total = ldata2.get("total", 0)
                print(f"Log count before: {old_total} -> after: {new_total}")
                
                if new_total > old_total:
                    print("SUCCESS: New audit log entry was created!")
                    latest = ldata2["logs"][0]
                    print(f"  Latest: [{latest['action_type']}] {latest['description']}")
                else:
                    print("WARNING: Log count did not increase.")
            else:
                print("No students found.")
        else:
            print(f"Failed to fetch students: {students_res.status_code}")

        print("\n=== ALL VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(verify())
