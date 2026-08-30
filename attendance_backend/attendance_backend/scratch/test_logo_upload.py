import requests
import os

BASE_URL = "http://localhost:8000"
SUPER_ADMIN_EMAIL = "superadmin@iot.com"
SUPER_ADMIN_PASSWORD = "Admin@1234"

def test_logo_upload():
    print("--- Diagnostic Tool: Backend Logo Upload ---")
    
    # 1. Login to get token
    print(f"Logging in as {SUPER_ADMIN_EMAIL}...")
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if login_res.status_code != 200:
            print(f"LOGIN FAILED: {login_res.status_code} - {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        print("Login Successful.")
    except Exception as e:
        print(f"LOGIN ERROR: {e}")
        return

    # 2. Test /admin/system/logo (The endpoint the user says is 404)
    print("\nTesting POST /admin/system/logo...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a tiny mock image file
    with open("temp_test_logo.png", "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff? \x00\x05\xfe\x02\xfe\x0dc\x44\x20\x00\x00\x00\x00IEND\xaeB`\x82")

    try:
        with open("temp_test_logo.png", "rb") as f:
            files = {"file": ("test.png", f, "image/png")}
            res = requests.post(f"{BASE_URL}/admin/system/logo", headers=headers, files=files)
            print(f"STATUS: {res.status_code}")
            print(f"RESPONSE: {res.text}")
            
            if res.status_code == 404:
                print("!! CONFIRMED: 404 NOT FOUND !!")
                print("Checking /api/admin/system/logo...")
                res2 = requests.post(f"{BASE_URL}/api/admin/system/logo", headers=headers, files=files)
                print(f"STATUS (/api/): {res2.status_code}")
                print(f"RESPONSE (/api/): {res2.text}")
    except Exception as e:
        print(f"UPLOAD ERROR: {e}")
    finally:
        if os.path.exists("temp_test_logo.png"):
            os.remove("temp_test_logo.png")

if __name__ == "__main__":
    test_logo_upload()
