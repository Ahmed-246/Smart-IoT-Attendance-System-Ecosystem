"""
Integration tests for Smart Attendance System API.
Run with: pytest tests/ -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.main import app
from app.db.database import get_db, Base
from app.core.security import hash_password

# ─── Test DB setup ────────────────────────────────────────────
TEST_DB_URL = "postgresql+asyncpg://postgres:password@localhost:5432/attendance_test_db"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest_asyncio.fixture
async def admin_token(client):
    """Seed admin and return JWT."""
    from app.models.user import User, UserRole
    async with TestSession() as db:
        admin = User(
            email="admin@test.com",
            password_hash=hash_password("Admin@1234"),
            role=UserRole.admin,
        )
        db.add(admin)
        await db.commit()

    resp = await client.post("/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin@1234",
    })
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ─── Auth Tests ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client, admin_token):
    assert admin_token is not None


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    from app.models.user import User, UserRole
    async with TestSession() as db:
        user = User(
            email="user@test.com",
            password_hash=hash_password("correct"),
            role=UserRole.student,
        )
        db.add(user)
        await db.commit()

    resp = await client.post("/auth/login", json={
        "email": "user@test.com",
        "password": "wrong",
    })
    assert resp.status_code == 401


# ─── Admin Tests ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_student(client, auth_headers):
    # Create course first
    resp = await client.post("/admin/courses", json={"name": "Math 101"}, headers=auth_headers)
    assert resp.status_code == 200
    course_id = resp.json()["id"]

    resp = await client.post("/admin/students", json={
        "name": "John Doe",
        "email": "john@test.com",
        "rfid_uid": "AABBCCDD",
        "course_id": course_id,
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["rfid_uid"] == "AABBCCDD"


@pytest.mark.asyncio
async def test_register_device(client, auth_headers):
    resp = await client.post("/admin/devices", json={
        "device_name": "Lab-ESP32-01",
        "location": "Room 101",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "api_key" in data
    assert len(data["api_key"]) > 10


# ─── Session Tests ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_and_close_session(client, auth_headers):
    resp = await client.post("/admin/courses", json={"name": "Physics"}, headers=auth_headers)
    course_id = resp.json()["id"]

    # Create session
    resp = await client.post("/sessions/", json={"course_id": course_id}, headers=auth_headers)
    assert resp.status_code == 200
    session_id = resp.json()["id"]
    assert resp.json()["is_active"] is True

    # Duplicate session should fail
    resp2 = await client.post("/sessions/", json={"course_id": course_id}, headers=auth_headers)
    assert resp2.status_code == 409

    # Close session
    resp3 = await client.patch(f"/sessions/{session_id}/close", headers=auth_headers)
    assert resp3.status_code == 200
    assert resp3.json()["is_active"] is False


# ─── Attendance Scan Tests ────────────────────────────────────

@pytest.mark.asyncio
async def test_rfid_scan_flow(client, auth_headers):
    # Setup: course → student → device → session
    c_resp = await client.post("/admin/courses", json={"name": "CS101"}, headers=auth_headers)
    course_id = c_resp.json()["id"]

    await client.post("/admin/students", json={
        "name": "Alice",
        "email": "alice@test.com",
        "rfid_uid": "RFID001",
        "course_id": course_id,
    }, headers=auth_headers)

    d_resp = await client.post("/admin/devices", json={"device_name": "ESP-01"}, headers=auth_headers)
    api_key = d_resp.json()["api_key"]

    await client.post("/sessions/", json={"course_id": course_id}, headers=auth_headers)

    # Scan
    resp = await client.post(
        "/attendance/scan",
        json={"rfid_uid": "RFID001"},
        headers={"X-Device-Key": api_key},
    )
    assert resp.status_code == 200
    assert resp.json()["student"] == "Alice"
    assert resp.json()["status"] == "success"


@pytest.mark.asyncio
async def test_duplicate_scan_rejected(client, auth_headers):
    c_resp = await client.post("/admin/courses", json={"name": "Bio"}, headers=auth_headers)
    course_id = c_resp.json()["id"]

    await client.post("/admin/students", json={
        "name": "Bob",
        "email": "bob@test.com",
        "rfid_uid": "RFID002",
        "course_id": course_id,
    }, headers=auth_headers)

    d_resp = await client.post("/admin/devices", json={"device_name": "ESP-02"}, headers=auth_headers)
    api_key = d_resp.json()["api_key"]
    await client.post("/sessions/", json={"course_id": course_id}, headers=auth_headers)

    headers = {"X-Device-Key": api_key}
    r1 = await client.post("/attendance/scan", json={"rfid_uid": "RFID002"}, headers=headers)
    assert r1.status_code == 200

    r2 = await client.post("/attendance/scan", json={"rfid_uid": "RFID002"}, headers=headers)
    assert r2.status_code == 409  # duplicate blocked


@pytest.mark.asyncio
async def test_invalid_device_key_rejected(client):
    resp = await client.post(
        "/attendance/scan",
        json={"rfid_uid": "ANYUID"},
        headers={"X-Device-Key": "fake-key-000"},
    )
    assert resp.status_code == 403


# ─── Health Check ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
