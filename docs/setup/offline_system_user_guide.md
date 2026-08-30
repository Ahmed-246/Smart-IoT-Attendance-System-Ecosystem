# Smart IoT Attendance System: User Guide

This guide explains how to use the completely offline attendance system on a day-to-day basis, especially for presentations and interviews.

## 1. Powering Up the System
1. **The Scanner:** Plug the ESP32 USB cable into the **Black USB port** of the Raspberry Pi. This provides power.
2. **The Server:** Plug the Raspberry Pi into a wall outlet or a strong power bank.
3. **Wait:** Give the system exactly **90 seconds** to boot. During this time:
   - The Pi turns on.
   - The Wi-Fi network `SmartAttendance` starts broadcasting.
   - The Python Backend automatically starts via PM2.
   - The ESP32 connects to the Pi.

## 2. Accessing the Dashboard
You do **not** need internet access, and you do **not** need the laptop.

1. Open your phone, iPad, or laptop Wi-Fi settings.
2. Connect to the network: **`SmartAttendance`** (Password: `university-admin`).
3. **For Phones/Tablets:** A "Sign in to network" popup will appear automatically (Captive Portal). Tap it, and it will take you directly to the system.
4. **For Laptops:** Open a browser and type **`http://otu.university`**.

## 3. Registering New Devices (Admin Center)
Because the ESP32 is using a `"PENDING"` API key for security, you must approve it:
1. Log in to `http://otu.university` with the admin account (`superadmin@iot.com` / `Admin@1234`).
2. Navigate to the **IoT Devices** or **Admin Center** section.
3. You will see a pending request from the newly booted ESP32.
4. Click **Approve** (or assign it to a classroom).
5. The ESP32 terminal will update to say "Received API Key" and is now ready to scan student cards.

## 4. Taking Attendance
- Students simply tap their RFID cards on the ESP32.
- The ESP32 communicates with the Pi over the offline Wi-Fi.
- The dashboard updates in real-time, instantly marking the student as present.

## 5. Shutting Down
When your presentation or session is over, simply unplug the Raspberry Pi from the wall. PM2 and PostgreSQL safely manage the database state, so no data is lost.
