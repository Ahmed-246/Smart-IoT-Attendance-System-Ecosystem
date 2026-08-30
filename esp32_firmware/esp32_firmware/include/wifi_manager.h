#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "led.h"

namespace WiFiManager {

static unsigned long _lastReconnectAttempt = 0;
static bool _wasConnected = false;

// Block until connected (called once in setup)
bool connect() {
    Serial.printf("[WiFi] Connecting to: %s\n", WIFI_SSID);
    LED::wifiConnecting();

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - start > WIFI_TIMEOUT_MS) {
            Serial.println("[WiFi] TIMEOUT — could not connect.");
            LED::error();
            return false;
        }
        delay(300);
        Serial.print(".");
    }

    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    LED::ready();
    _wasConnected = true;
    return true;
}

// Call in loop() — silently reconnects if dropped
void maintain() {
    if (WiFi.status() == WL_CONNECTED) {
        _lastReconnectAttempt = millis();
        _wasConnected = true;
        return;
    }
    // Lost connection
    if (_wasConnected) {
        Serial.println("[WiFi] Connection lost.");
        _wasConnected = false;
        LED::wifiConnecting();
    }
    unsigned long now = millis();
    if (now - _lastReconnectAttempt >= WIFI_RECONNECT_MS) {
        _lastReconnectAttempt = now;
        Serial.println("[WiFi] Reconnecting…");
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
}

bool isConnected() { return WiFi.status() == WL_CONNECTED; }

} // namespace WiFiManager
