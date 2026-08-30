import requests
import json

base_url = "http://127.0.0.1:8000"

def test_student_creation():
    payload = {
        "name": "Test Hierarchy Student",
        "email": "test.hierarchy@school.edu",
        "rfid_uid": "TEST9999",
        "university_id": "U2024TEST",
        "department_id": 1,
        "academic_year": 1
    }
    
    print(f"[TEST] Creating student in department 1...")
    res = requests.post(f"{base_url}/admin/students", json=payload)
    if res.status_code != 201:
        print(f"[ERROR] Student creation failed: {res.text}")
        return
    
    student = res.json()
    print(f"[SUCCESS] Student created: {student['id']}")
    
    print(f"[TEST] Verifying auto-enrollments...")
    # Get enrollments for this student
    # Note: We don't have a direct /enrollments/student/{id} but we can check via grades or attendance
    # Actually, let's just check the course students list for course 1
    res = requests.get(f"{base_url}/admin/courses/1/students")
    students = res.json()
    found = any(s['id'] == student['id'] for s in students)
    if found:
        print("[SUCCESS] Automated enrollment verified! Student added to department course.")
    else:
        print("[FAIL] Automated enrollment failed. Student not found in course list.")

if __name__ == "__main__":
    test_student_creation()
