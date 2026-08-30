import asyncio
from app.main import app

def list_routes():
    print(f"{'METHOD':<10} | {'PATH':<40} | {'NAME'}")
    print("-" * 70)
    for route in app.routes:
        methods = ", ".join(route.methods) if hasattr(route, 'methods') else "MOUNT"
        print(f"{methods:<10} | {route.path:<40} | {route.name}")

if __name__ == "__main__":
    list_routes()
