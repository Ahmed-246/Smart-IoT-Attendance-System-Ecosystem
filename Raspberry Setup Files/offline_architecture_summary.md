# Smart IoT Attendance System: Offline Architecture Summary

This document breaks down the technical stack and network architecture of the fully self-contained offline deployment.

## 1. Hardware Architecture
- **Server:** Raspberry Pi 4 (4GB RAM) running Raspberry Pi OS Lite (Bookworm). It acts as the central brain, hosting the database, backend, frontend, and Wi-Fi network.
- **IoT Device:** ESP32 Microcontroller with an RC522 RFID scanner. It acts as a lightweight client that transmits data wirelessly to the Server.

## 2. Networking & Routing Magic
The Pi operates without an external router or internet connection, creating its own ecosystem:
- **`hostapd`:** Transforms the Pi's Wi-Fi chip (`wlan0`) into a router/Access Point broadcasting the `SmartAttendance` SSID. We use `CCMP` encryption to ensure compatibility with ESP32 devices.
- **`dnsmasq`:** Acts as the DNS Server and DHCP Server (IP Giver). It dynamically assigns IPs starting from `192.168.4.2` to connecting devices.
- **DNS Spoofing (Captive Portal):** `dnsmasq` is configured with `address=/#/192.168.4.1`, which forces *every single* web request (e.g., google.com, apple.com) to resolve to the Pi's IP address.

## 3. Web Server & Proxying (Nginx)
Nginx is the traffic director. It listens on Port 80 and handles two types of traffic:
1. **The Captive Portal Catch-All:** Any traffic that hits the `default_server` (because the phone requested a random domain) is instantly met with a `302 Redirect` to `http://otu.university`. This triggers the "Sign in to network" popups on iOS and Android.
2. **The Application Host:** Traffic requesting `otu.university` is served the React static files. Traffic hitting `/api` is securely proxied to the Python Backend.

## 4. Backend Application (FastAPI & PM2)
- **FastAPI:** Built with Python, it manages users, roles, sessions, and IoT interactions.
- **Uvicorn:** The ASGI server running FastAPI on `192.168.4.1:8000`.
- **PM2:** An industrial-grade process manager originally for Node.js, utilized here to daemonize the Python server. PM2 ensures the backend starts automatically on boot and auto-restarts if it crashes.

## 5. Database (PostgreSQL)
A local instance of PostgreSQL stores all attendance data. It is highly robust and immune to sudden power cuts thanks to Write-Ahead Logging (WAL). It connects to FastAPI via `asyncpg`.

## 6. The Boot-Timing Solution
Raspberry Pi OS Bookworm has a "race condition" where `dnsmasq` attempts to start before the physical Wi-Fi hardware is initialized. This was solved using `cron`. A `@reboot` task waits 10 seconds, manually binds the `192.168.4.1` IP to the `wlan0` interface using `ip addr add`, and then force-restarts `dnsmasq`. This guarantees 100% startup reliability.
