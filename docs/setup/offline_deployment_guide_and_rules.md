# Smart IoT Attendance System: Update Deployment Guide & AI Rules

This document outlines how to safely apply code updates made on your Windows laptop to the offline Raspberry Pi server. It also provides a rule prompt to feed to your AI assistants so they understand your environment.

## 1. How to Deploy Updates

Whenever you make code changes on your laptop, follow these steps to deploy them to the Pi:

### Step 1: Connect to the Pi
You can either:
1. Connect your laptop to the `SmartAttendance` Wi-Fi network.
2. OR plug the Ethernet cable into the Pi and your home router (if you need internet access on your laptop while deploying).

### Step 2: Push Frontend Updates (React)
If you changed the React UI (`attendance-dashboard`):
1. In your Windows terminal, run: `npm run build`
2. Transfer the build folder to the Pi (Replace `<PI_IP>` with `192.168.4.1` if connected via Wi-Fi):
   ```powershell
   scp -r "C:\path\to\attendance-dashboard\build" shadow@<PI_IP>:/home/shadow/smart_Iot_Project/frontend/
   ```
   *(Nginx instantly serves the new files, no restart needed).*

### Step 3: Push Backend Updates (FastAPI)
If you changed Python code (`attendance_backend`):
1. Transfer the updated files:
   ```powershell
   scp -r "C:\path\to\attendance_backend\app" shadow@<PI_IP>:/home/shadow/smart_Iot_Project/backend/
   ```
2. SSH into the Pi and restart the backend:
   ```powershell
   ssh shadow@<PI_IP>
   pm2 restart backend
   ```

### Step 4: Push ESP32 Updates
If you changed the ESP32 code, simply plug the ESP32 back into your laptop via USB and click **Upload** in PlatformIO/Arduino IDE. Then plug it back into the Pi.

---

## 2. AI Context Prompt (Copy and Paste into Cursor/AI Rules)

*Copy the text below and paste it into your AI assistant's "Rules", "System Prompt", or `.cursorrules` file. This guarantees the AI understands your highly specific offline deployment environment.*

> **PROJECT ENVIRONMENT RULES:**
> This project is a "Smart IoT Attendance System" designed to run on a completely offline, standalone Raspberry Pi 4 acting as its own Wi-Fi Access Point (`SmartAttendance`) and Captive Portal (`http://otu.university`).
> 
> **Architecture Context:**
> - **Frontend:** React JS, built into static files and served by Nginx directly from `/home/shadow/smart_Iot_Project/frontend/build`.
> - **Backend:** FastAPI (Python), running in a `venv`, managed by PM2 on port `8000`. Database is local PostgreSQL.
> - **IoT:** ESP32 with RC522 RFID scanner connecting to the Pi over the offline Wi-Fi, transmitting payloads to `192.168.4.1:8000/api`.
> 
> **Development Rules:**
> 1. Never assume the production server has internet access. All pip packages, npm modules, or external APIs will fail in production. Do not suggest adding cloud dependencies.
> 2. The Nginx reverse proxy routes all `/api` traffic to the backend, so frontend API calls must be made to `/api/` (relative paths) or `http://otu.university/api/`.
> 3. If a backend change requires a new pip package, explicitly remind the user they must connect the Pi to the internet via Ethernet to install it.
> 4. Remind the user to run `npm run build` for frontend changes and to use `scp` to transfer files to the Pi, followed by `pm2 restart backend` if Python code was modified.
