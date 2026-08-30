import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.main import seed_demo_data

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
