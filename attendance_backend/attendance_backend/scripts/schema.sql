-- ============================================================
-- Smart IoT Attendance System — PostgreSQL Schema
-- Run with: psql -U postgres -d attendance_db -f schema.sql
-- ============================================================

-- Create database (run separately if needed)
-- CREATE DATABASE attendance_db;

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM types ──────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Users (Authentication) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role NOT NULL DEFAULT 'student',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Instructors ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instructors (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Courses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    instructor_id INT REFERENCES instructors(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Students ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    rfid_uid   VARCHAR(100) UNIQUE NOT NULL,
    course_id  INT REFERENCES courses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_rfid ON students(rfid_uid);

-- ─── Sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id            SERIAL PRIMARY KEY,
    course_id     INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id INT REFERENCES instructors(id) ON DELETE SET NULL,
    start_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time      TIMESTAMPTZ,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);

-- ─── Attendance ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id            SERIAL PRIMARY KEY,
    student_id    INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id    INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    instructor_id INT REFERENCES instructors(id) ON DELETE SET NULL,
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status        attendance_status NOT NULL DEFAULT 'present',
    CONSTRAINT uq_student_session UNIQUE (student_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student   ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session   ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);

-- ─── Devices (ESP32 registry) ────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
    id          SERIAL PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    api_key     VARCHAR(255) UNIQUE NOT NULL,
    location    VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devices_api_key ON devices(api_key);

-- ─── Seed: Default admin user ────────────────────────────────
-- Password: Admin@1234  (bcrypt hash — change in production!)
INSERT INTO users (email, password_hash, role)
VALUES (
    'admin@school.edu',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- ─── Views ───────────────────────────────────────────────────

-- Daily attendance summary
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT
    s.id                            AS session_id,
    c.name                          AS course_name,
    i.name                          AS instructor_name,
    s.start_time::DATE              AS session_date,
    COUNT(a.id)                     AS present_count,
    (SELECT COUNT(*) FROM students st WHERE st.course_id = c.id) AS total_students
FROM sessions s
JOIN courses c ON c.id = s.course_id
LEFT JOIN instructors i ON i.id = s.instructor_id
LEFT JOIN attendance a ON a.session_id = s.id
GROUP BY s.id, c.name, i.name, s.start_time, c.id;

-- Student attendance rate
CREATE OR REPLACE VIEW student_attendance_rate AS
SELECT
    st.id           AS student_id,
    st.name         AS student_name,
    c.name          AS course_name,
    COUNT(a.id)     AS sessions_attended,
    (SELECT COUNT(*) FROM sessions se WHERE se.course_id = st.course_id) AS total_sessions,
    ROUND(
        COUNT(a.id)::NUMERIC /
        NULLIF((SELECT COUNT(*) FROM sessions se WHERE se.course_id = st.course_id), 0) * 100,
        1
    ) AS attendance_rate_pct
FROM students st
LEFT JOIN courses c ON c.id = st.course_id
LEFT JOIN attendance a ON a.student_id = st.id
GROUP BY st.id, st.name, c.name, st.course_id;
