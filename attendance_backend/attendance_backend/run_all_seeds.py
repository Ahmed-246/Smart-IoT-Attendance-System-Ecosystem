import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.main import seed_admin, seed_demo_data

async def main():
    await seed_admin()
    await seed_demo_data()

if __name__ == "__main__":
    asyncio.run(main())
