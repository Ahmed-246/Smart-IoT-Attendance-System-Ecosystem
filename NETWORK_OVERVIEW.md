# Network Overview for Smart IoT Attendance System

## 1. Overview
The Smart IoT Attendance System runs on a **Raspberry Pi 4** that provides a dedicated Wi‑Fi access point (SSID **SmartAttendance**). All components – the backend API, the frontend web UI, and the local LLM (Ollama) – communicate over this isolated network.

## 2. Physical & Link‑Layer
| Layer | Component | Details |
|-------|-----------|---------|
| **Wi‑Fi Hotspot** | `hostapd` + `dnsmasq` on the Pi | SSID: `SmartAttendance`<br>IP range: `192.168.4.0/24`<br>Gateway & DNS: `192.168.4.1` (the Pi itself) |
| **Ethernet (optional)** | Pi’s LAN port | Can be used for upstream Internet access (e.g., to pull Docker images or update packages). |

## 3. Network Services
| Service | Port | Protocol | Purpose |
|--------|------|----------|---------|
| **Nginx (reverse proxy)** | `80` (HTTP) | TCP | Exposes the FastAPI backend and the React frontend under the hostname `otu.university` (or the Pi IP `192.168.4.1`). Handles `/api/*` routing to the backend and serves static UI files. |
| **FastAPI Backend** | `8000` | HTTP | Main application exposing REST endpoints (`/api/login`, `/api/chat`, `/api/ai/status`, etc.). |
| **Ollama (LLM server)** | `11434` | HTTP (JSON) | Hosts the `qwen:0.5b` model locally. The backend forwards user messages to `http://127.0.0.1:11434/api/chat`. |
| **Captive Portal** | `80` (same Nginx) | HTTP | When a device first connects to the Wi‑Fi, DNS resolves any request to `otu.university` so the user is redirected to the attendance UI. |
| **DNSMasq** | `53` | UDP/TCP | Provides local DNS resolution for `otu.university` → `192.168.4.1`. Also hands out DHCP leases. |
| **Android App** | Uses HTTP over Wi‑Fi | The app calls `http://otu.university/api/...` (or fallback `http://192.168.4.1/api/...`). |

## 4. Endpoint Summary
### Backend (FastAPI)
- `GET /api/health` – service health check.
- `POST /api/login` – user authentication (returns JWT).
- `POST /api/chat` – forwards chat payload to Ollama.
- `GET /api/ai/status` – returns model (name, version, online/offline).
- `GET /api/users/me` – user profile.

### Frontend (React)
- Calls the same `/api/*` endpoints using the base URL defined in `REACT_APP_API_URL` (environment variable).
- WebSocket or SSE not used – all communication is simple HTTP/JSON.

## 5. CORS & Security
- **CORS origins** are configured in `attendance_backend/app/main.py` to allow:
  - `http://otu.university`
  - `http://192.168.4.1`
  - `http://localhost:3000` (development)
- **JWT** protects all endpoints except `/api/health` and `/api/login`.
- **Self‑signed HTTPS** (optional) can be enabled in Nginx; the Android app would need to trust the certificate.

## 6. Typical Data Flow
1. Android device connects to **SmartAttendance** Wi‑Fi → obtains IP via DHCP.
2. DNS resolves `otu.university` to `192.168.4.1`.
3. App sends `POST /api/login` → FastAPI authenticates, returns JWT.
4. App sends `POST /api/chat` with JWT and user message.
5. FastAPI receives request, adds the **system prompt** (Molly) and forwards payload to **Ollama** at `http://127.0.0.1:11434/api/chat`.
6. Ollama returns LLM response → FastAPI returns it to the Android app.
7. Frontend web UI follows the same path when accessed via a browser on the same network.

## 7. Troubleshooting Checklist
- **Ping** `192.168.4.1` from the Android device to ensure Wi‑Fi connectivity.
- **curl http://otu.university/api/health** from the Pi – should return `{ "status": "ok" }`.
- **curl http://otu.university/api/ai/status** – verifies Ollama model availability.
- Verify **Nginx** logs (`/var/log/nginx/access.log`) for 404/502 errors.
- Check **FastAPI** logs (`pm2 logs sovereign-backend`) for exceptions.
- Ensure **Ollama** is running (`ollama list`) and the model `qwen:0.5b` is loaded.

## 8. Diagram (simplified)
````mermaid
flowchart LR
    subgraph Device
        A[Android App / Browser] -->|Wi‑Fi| B[Pi (192.168.4.1)]
    end
    B -->|DNS/HTTP| C[Nginx]
    C -->|proxy /api| D[FastAPI Backend]
    D -->|HTTP| E[Ollama (qwen:0.5b)]
    D -->|JWT Auth| F[Database]
    style A fill:#BBDEFB,stroke:#2196F3,stroke-width:2px
    style B fill:#C8E6C9,stroke:#4CAF50,stroke-width:2px
    style C fill:#FFF9C4,stroke:#FFEB3B,stroke-width:2px
    style D fill:#FFCCBC,stroke:#FF5722,stroke-width:2px
    style E fill:#D1C4E9,stroke:#673AB7,stroke-width:2px
    style F fill:#B0BEC5,stroke:#607D8B,stroke-width:2px
````

---
**Location**: `c:/Users/shadlence/Desktop/Calude Project/Smart IoT Attendance System/NETWORK_OVERVIEW.md`
