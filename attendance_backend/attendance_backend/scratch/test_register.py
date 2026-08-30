import requests

url = "http://localhost:8000/api/auth/register/init"
payload = {"name": "ahmed", "email": "ahmed@gmail.com"}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
