# Smart IoT Attendance System — Backend

FastAPI + PostgreSQL backend for the Smart RFID Attendance System.

---

## Project Structure

```
attendance_backend/
├── app/
│   ├── main.py                  # FastAPI app entry point
│   ├── api/
│   │   ├── __init__.py          # Router aggregator
│   │   └── routes/
│   │       ├── auth.py          # POST /auth/login
│   │       ├── attendance.py    # POST /attendance/scan  GET /attendance/...
│   │       ├── sessions.py      # POST/GET/PATCH /sessions/...
│   │       ├── admin.py         # Admin CRUD + reports
│   │       └── ai.py            # POST /ai/query
│   ├── core/
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   └── security.py          # JWT, hashing, role guards
│   ├── db/
│   │   └── database.py          # Async engine, session, Base
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── instructor.py
│   │   ├── course.py
│   │   ├── session.py
│   │   ├── attendance.py
│   │   └── device.py
│   └── schemas/
│       └── schemas.py           # Pydantic request/response models
├── scripts/
│   ├── schema.sql               # Raw PostgreSQL schema + views
│   ├── nginx.conf               # NGINX reverse proxy config
│   ├── attendance.service       # systemd service file
│   └── deploy.sh                # One-command Raspberry Pi deploy
├── tests/
│   └── test_api.py              # Async integration tests
├── requirements.txt
├── alembic.ini
└── .env.example
```

---

## Quick Start (Local Dev)

```bash
# 1. Clone and enter project
cd attendance_backend

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 5. Create DB
createdb attendance_db
psql -d attendance_db -f scripts/schema.sql

# 6. Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

---

## API Reference

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login, get JWT | None |

### Attendance (ESP32)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/attendance/scan` | RFID scan → record attendance | X-Device-Key |
| GET | `/attendance/student/{id}` | Student history | JWT |
| GET | `/attendance/session/{id}` | Session records | JWT (instructor+) |

### Sessions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/sessions/` | Start new session | JWT (instructor+) |
| GET | `/sessions/active` | List active sessions | JWT (instructor+) |
| PATCH | `/sessions/{id}/close` | End a session | JWT (instructor+) |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/admin/users` | Create user | JWT (admin) |
| GET | `/admin/users` | List users | JWT (admin) |
| POST | `/admin/students` | Add student | JWT (admin) |
| GET | `/admin/students` | List students | JWT (instructor+) |
| POST | `/admin/instructors` | Add instructor | JWT (admin) |
| POST | `/admin/courses` | Create course | JWT (admin) |
| POST | `/admin/devices` | Register ESP32 device | JWT (admin) |
| GET | `/admin/reports/session/{id}` | Attendance report | JWT (instructor+) |

### AI Chatbot
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/ai/query` | Ask attendance questions | JWT |

---

## ESP32 Integration

The ESP32 sends this request on every RFID scan:

```http
POST /attendance/scan
X-Device-Key: <your-device-api-key>
Content-Type: application/json

{"rfid_uid": "AABBCCDD"}
```

Register your ESP32 device via admin API to get an `api_key`.

---

## Security

- All user endpoints protected by JWT Bearer token
- ESP32 endpoints protected by device API key (`X-Device-Key` header)
- Passwords stored as bcrypt hashes
- Duplicate scan prevention via DB unique constraint
- One active session per course enforced at API level
- UFW firewall + Fail2Ban IDS on Raspberry Pi
- HTTPS via NGINX + Let's Encrypt

---

## Running Tests

```bash
# Create test DB first
createdb attendance_test_db

# Run tests
pytest tests/ -v
```

---

## Deployment on Raspberry Pi 4

```bash
bash scripts/deploy.sh
```

Then edit `/home/pi/attendance_backend/.env` with your real credentials and restart:

```bash
sudo systemctl restart attendance
```

---

## Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | admin@school.edu |
| Password | Admin@1234 |

**Change these immediately in `.env` before deployment.**
