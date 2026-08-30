#pragma once

// ─── WiFi ─────────────────────────────────────────────────────────────────
#define WIFI_SSID        "SmartAttendance"
#define WIFI_PASSWORD    "university-admin"
#define WIFI_TIMEOUT_MS  15000

// ─── Backend ──────────────────────────────────────────────────────────────
// Local dev:  "http://192.168.1.100:8000"
// Production: "https://your-domain.com"
#define SERVER_BASE_URL  "http://192.168.4.1:8000"
#define SCAN_ENDPOINT    "/attendance/scan"
#define HEALTH_ENDPOINT  "/attendance/heartbeat"
#define PROVISION_ENDPOINT "/iot/hello"

// Set to PENDING for Smart Discovery Radar
#define DEVICE_API_KEY   "PENDING"

// ─── RFID (RC522) pin mapping ─────────────────────────────────────────────
//  RC522 pin  →  ESP32 pin
//  SDA (SS)   →  GPIO 5
//  SCK        →  GPIO 18
//  MOSI       →  GPIO 23
//  MISO       →  GPIO 19
//  RST        →  GPIO 22
//  3.3V       →  3.3V
//  GND        →  GND
#define RC522_SS_PIN     5
#define RC522_RST_PIN    22

// ─── LED feedback ─────────────────────────────────────────────────────────
#define LED_GREEN_PIN    25   // built-in LED on most ESP32 boards
#define LED_RED_PIN      26   // wire an external LED + 220Ω resistor here

// ─── Buzzer (optional) ────────────────────────────────────────────────────
#define BUZZER_PIN       27
#define BUZZER_ENABLED   true   // set true if you have a buzzer wired

// ─── Timing ───────────────────────────────────────────────────────────────
#define SCAN_COOLDOWN_MS      3000   // min ms between two scans of same card
#define HTTP_TIMEOUT_MS       8000   // max ms to wait for server response
#define WIFI_RECONNECT_MS     30000  // how often to retry WiFi if lost
#define HEALTH_CHECK_INTERVAL 20000  // ms between server health pings (20 seconds)
