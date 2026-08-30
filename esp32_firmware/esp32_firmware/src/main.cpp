#include <Arduino.h>
#include "config.h"
#include "led.h"
#include "wifi_manager.h"
#include "rfid_reader.h"
#include "http_client.h"
#include "cooldown.h"

// ─── State ────────────────────────────────────────────────────────────────
static unsigned long lastHealthCheck = 0;
static bool          serverHealthy   = false;
static bool          firstHeartbeat  = true; // Force immediate heartbeat on boot

// ─── Print helpers ────────────────────────────────────────────────────────
void printBanner() {
    Serial.println();
    Serial.println("╔══════════════════════════════════════╗");
    Serial.println("║   Smart Attendance — ESP32 Firmware  ║");
    Serial.println("║   v1.0  —  RC522 + FastAPI backend   ║");
    Serial.println("╚══════════════════════════════════════╝");
    Serial.println();
}

void printScanResult(const ScanResponse &resp, const String &uid) {
    Serial.printf("[SCAN] UID: %s\n", uid.c_str());
    switch (resp.result) {
        case ScanResult::SUCCESS:
            Serial.printf("[SCAN] ✓ SUCCESS — %s  (%s)\n",
                resp.studentName.c_str(), resp.sessionName.c_str());
            break;
        case ScanResult::DUPLICATE:
            Serial.println("[SCAN] ⚠ DUPLICATE — already recorded this session");
            break;
        case ScanResult::NO_SESSION:
            Serial.println("[SCAN] ✗ NO SESSION — no active session for this course");
            break;
        case ScanResult::UNKNOWN_CARD:
            Serial.println("[SCAN] ✗ UNKNOWN CARD — not registered in system");
            break;
        case ScanResult::AUTH_FAIL:
            Serial.println("[SCAN] ✗ AUTH FAIL — check DEVICE_API_KEY in config.h");
            break;
        case ScanResult::SERVER_ERROR:
            Serial.printf("[SCAN] ✗ SERVER ERROR %d\n", resp.httpCode);
            break;
        case ScanResult::NETWORK_ERROR:
            Serial.println("[SCAN] ✗ NETWORK ERROR — check WiFi / server URL");
            break;
    }
}

void handleScanResult(const ScanResponse &resp) {
    switch (resp.result) {
        case ScanResult::SUCCESS:      LED::success();   break;
        case ScanResult::DUPLICATE:    LED::duplicate(); break;
        case ScanResult::AUTH_FAIL:
        case ScanResult::UNKNOWN_CARD:
        case ScanResult::NO_SESSION:
        case ScanResult::SERVER_ERROR:
        case ScanResult::NETWORK_ERROR: LED::error();   break;
    }
    delay(500);
    LED::ready();
}

// ─── Setup ────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(300);
    printBanner();

    LED::setup();

    // Connect to WiFi — blink red until connected
    bool connected = WiFiManager::connect();
    if (!connected) {
        Serial.println("[BOOT] WiFi failed. Rebooting in 10s…");
        delay(10000);
        ESP.restart();
    }

    // Init RC522
    RFIDReader::setup();

    // Smart Discovery Handshake
    Serial.println("[BOOT] Sending Discovery Signal...");
    HttpClient::startDiscovery();

    // Quick health check
    Serial.println("[BOOT] Checking backend health…");
    serverHealthy = HttpClient::checkHealth();
    if (serverHealthy) {
        Serial.println("[BOOT] Backend is reachable ✓");
    } else {
        Serial.println("[BOOT] WARNING — backend not reachable. Will retry.");
    }

    LED::ready();
    Serial.println("[BOOT] Ready. Hold RFID card to reader.\n");
}

// ─── Main loop ────────────────────────────────────────────────────────────
void loop() {
    // 1. Maintain WiFi connection
    WiFiManager::maintain();

    // 2. Periodic server health check
    unsigned long now = millis();
    if (firstHeartbeat || (now - lastHealthCheck >= HEALTH_CHECK_INTERVAL)) {
        firstHeartbeat  = false;
        lastHealthCheck = now;
        serverHealthy   = HttpClient::checkHealth();
        
        // If we aren't healthy (maybe because we don't have a key yet), try discovery again!
        if (!serverHealthy) {
            Serial.println("[HEALTH] Not active yet. Retrying discovery...");
            HttpClient::startDiscovery();
        } else {
            Serial.println("[HEALTH] Backend: OK ✓");
        }
    }

    // 3. Try to read an RFID card
    String uid;
    if (!RFIDReader::readCard(uid)) return;   // nothing on reader — fast return

    Serial.printf("\n[CARD] Detected UID: %s\n", uid.c_str());

    // 4. Cooldown check — ignore rapid re-reads of same card
    if (!Cooldown::allow(uid)) {
        Serial.println("[CARD] Cooldown — ignoring");
        return;
    }

    // 5. Warn if WiFi is down
    if (!WiFiManager::isConnected()) {
        Serial.println("[CARD] No WiFi — cannot send scan");
        LED::error();
        delay(500);
        LED::wifiConnecting();
        return;
    }

    // 6. Show "thinking" feedback while HTTP request is in flight
    LED::thinking();

    // 7. Send scan to backend
    ScanResponse resp = HttpClient::scanCard(uid);

    // 8. Print result + trigger LED/buzzer feedback
    printScanResult(resp, uid);
    handleScanResult(resp);
}
