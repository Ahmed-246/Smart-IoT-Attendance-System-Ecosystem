import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect(
        user='postgres', password='admin',
        database='attendance_db', host='localhost', port=5432
    )
    rows = await conn.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    )
    print("Tables in PostgreSQL database:")
    for r in rows:
        print(f"  - {r['tablename']}")
    
    # Check if system_activities exists
    table_names = [r['tablename'] for r in rows]
    if 'system_activities' in table_names:
        count = await conn.fetchval("SELECT COUNT(*) FROM system_activities")
        print(f"\nsystem_activities: {count} rows")
    else:
        print("\n*** system_activities table DOES NOT EXIST ***")
    
    if 'session_telemetry' in table_names:
        count = await conn.fetchval("SELECT COUNT(*) FROM session_telemetry")
        print(f"session_telemetry: {count} rows")
    else:
        print("*** session_telemetry table DOES NOT EXIST ***")
    
    await conn.close()

asyncio.run(check())
