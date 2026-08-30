import urllib.request
import json

def fetch(url):
    try:
        # Get token
        req_auth = urllib.request.Request(
            'http://localhost:8000/api/auth/login', 
            data=b'{"email":"admin@school.edu","password":"Admin@1234"}', 
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req_auth) as auth_resp:
            token = json.loads(auth_resp.read().decode('utf-8'))['access_token']
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
        with urllib.request.urlopen(req) as response:
            print(f"{url}: {response.status}")
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"{url}: ERROR -> {e} Body: {e.read().decode('utf-8')[:300]}")
        else:
            print(f"{url}: ERROR -> {e}")

if __name__ == "__main__":
    fetch("http://localhost:8000/api/admin/courses")
