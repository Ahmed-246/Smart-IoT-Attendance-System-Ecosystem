import sqlite3
conn = sqlite3.connect('attendance.db')
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cursor.fetchall()]
print("Tables in database:")
for t in tables:
    print(f"  - {t}")

# Check if system_activities exists
if 'system_activities' in tables:
    count = conn.execute("SELECT COUNT(*) FROM system_activities").fetchone()[0]
    print(f"\nsystem_activities table has {count} rows")
else:
    print("\n*** system_activities table DOES NOT EXIST ***")

if 'session_telemetry' in tables:
    count = conn.execute("SELECT COUNT(*) FROM session_telemetry").fetchone()[0]
    print(f"session_telemetry table has {count} rows")
else:
    print("*** session_telemetry table DOES NOT EXIST ***")

conn.close()
