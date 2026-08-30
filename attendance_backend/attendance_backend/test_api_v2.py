import httpx
import json

def test_add_student():
    url = "http://127.0.0.1:8000/admin/students"
    payload = {
        "name": "Test Student",
        "email": "test@school.edu",
        "rfid_uid": "TEST0001",
        "university_id": "U12345",
        "faculty": "Engineering",
        "department": "CS",
        "academic_year": 2
    }
    
    # We need to login as admin first to get the token, 
    # but the /admin/students list might be open for read-only or 
    # the endpoints might require auth.
    # Actually, seed_admin should have created admin@school.edu / Admin@1234.
    
    auth_url = "http://127.0.0.1:8000/auth/login"
    login_data = {"email": "admin@school.edu", "password": "Admin@1234"}
    
    try:
        with httpx.Client() as client:
            login_resp = client.post(auth_url, json=login_data)
            print(f"Login STATUS: {login_resp.status_code}")
            if login_resp.status_code != 200:
                print(f"Login FAILED: {login_resp.text}")
                return
            
            token = login_resp.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            resp = client.post(url, json=payload, headers=headers)
            print(f"Add Student STATUS: {resp.status_code}")
            print(f"Add Student RESPONSE: {resp.text}")
            
            if resp.status_code == 200:
                print("SUCCESS: Student added successfully with new columns.")
            else:
                print("FAILURE: Student add failed.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_add_student()
