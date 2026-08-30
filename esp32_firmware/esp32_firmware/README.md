# Smart Attendance — ESP32 Firmware

RFID attendance scanner using ESP32 + RC522.
Sends scans to the FastAPI backend over WiFi via HTTPS POST.

---

## File Structure

```
esp32_firmware/
├── platformio.ini          # PlatformIO build config + library deps
├── WIRING.txt              # Pin-by-pin wiring diagram
├── include/
│   ├── config.h            # ← ALL your settings go here
│   ├── led.h               # LED + buzzer feedback signals
│   ├── wifi_manager.h      # WiFi connect + auto-reconnect
│   ├── rfid_reader.h       # RC522 RFID read abstraction
│   ├── http_client.h       # HTTP POST to backend + response parsing
│   └── cooldown.h          # Prevents double-reads of same card
└── src/
    └── main.cpp            # setup() + loop() — main application
```

---

## Quick Start

### 1 — Install PlatformIO
- Install [VS Code](https://code.visualstudio.com/)
- Install the **PlatformIO IDE** extension

### 2 — Open the project
```
File → Open Folder → select esp32_firmware/
```
PlatformIO auto-detects `platformio.ini` and downloads all libraries.

### 3 — Configure `include/config.h`

Open `include/config.h` and fill in **4 things**:

```cpp
// Your WiFi
#define WIFI_SSID       "MyWiFiNetwork"
#define WIFI_PASSWORD   "mypassword123"

// Your Raspberry Pi's local IP (or domain for production)
#define SERVER_BASE_URL "http://192.168.1.105:8000"

// From Admin → Devices in the web dashboard
#define DEVICE_API_KEY  "abc123xyz..."
```

### 4 — Wire the hardware
See `WIRING.txt` for pin-by-pin diagram. Key connections:

| RC522 | ESP32 |
|-------|-------|
| SDA   | GPIO 5 |
| SCK   | GPIO 18 |
| MOSI  | GPIO 23 |
| MISO  | GPIO 19 |
| RST   | GPIO 22 |
| 3.3V  | 3.3V ⚠ |
| GND   | GND |

### 5 — Register the device in the dashboard
1. Open the web dashboard → **Devices** → **Register Device**
2. Copy the generated `api_key`
3. Paste it into `config.h` as `DEVICE_API_KEY`

### 6 — Flash the firmware
- Connect ESP32 via USB
- Click **Upload** in PlatformIO (or press `Ctrl+Alt+U`)

### 7 — Open Serial Monitor
- Click the plug icon in PlatformIO status bar (115200 baud)
- You'll see the boot sequence, WiFi connection, and every scan result

---

## How It Works

```
Power on
  → Connect WiFi
  → Health check backend
  → LED green = ready

Card presented
  → RC522 reads UID (hex string e.g. "AABBCCDD")
  → Cooldown check (ignore same card < 3 seconds)
  → LED alternate = sending…
  → POST /attendance/scan  { rfid_uid: "AABBCCDD" }
    Header: X-Device-Key: <api_key>
  → Parse response:
      200 → LED green ×2  (success)
      409 → LED amber     (duplicate)
      404 → LED red ×3    (no session / unknown card)
      403 → LED red ×3    (bad API key)
  → Ready for next card
```

---

## Serial Monitor Output

```
╔══════════════════════════════════════╗
║   Smart Attendance — ESP32 Firmware  ║
╚══════════════════════════════════════╝

[WiFi] Connecting to: MyWiFiNetwork
......
[WiFi] Connected! IP: 192.168.1.42
[RFID] RC522 ready. Waiting for cards…
[BOOT] Checking backend health…
[BOOT] Backend is reachable ✓
[BOOT] Ready. Hold RFID card to reader.

[CARD] Detected UID: AABBCCDD
[HTTP] POST http://192.168.1.105:8000/attendance/scan
[HTTP] Response 200: {"status":"success","student":"John Doe","session":"Math Lecture"}
[SCAN] ✓ SUCCESS — John Doe  (Math Lecture)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `WiFi TIMEOUT` | Check SSID/password in config.h; 2.4GHz only (ESP32 doesn't support 5GHz) |
| `AUTH FAIL` | Device API key doesn't match — re-copy from dashboard |
| `NO SESSION` | Start a session in the dashboard for that student's course first |
| `UNKNOWN CARD` | Register the student with this RFID UID in the dashboard |
| `NETWORK ERROR` | Check SERVER_BASE_URL — use IP not hostname for local dev |
| RC522 not detected | Check 3.3V (not 5V!), check SPI pins, check RST pin |
| Card not reading | Hold card still for ~0.5s; some cards need to be < 2cm from reader |

---

## Production Notes

- For HTTPS, use `WiFiClientSecure` and add your server's SSL certificate fingerprint
- `android:usesCleartextTraffic` is only needed for HTTP dev — switch to HTTPS for production
- Power the ESP32 from a stable 5V 1A USB supply; unstable power causes random resets
