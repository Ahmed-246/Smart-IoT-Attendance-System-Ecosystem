#pragma once
#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"

// Result codes returned from scanCard()
enum class ScanResult {
    SUCCESS,       // attendance recorded
    DUPLICATE,     // already scanned this session
    NO_SESSION,    // no active session for this card's course
    UNKNOWN_CARD,  // RFID not in database
    AUTH_FAIL,     // wrong API key
    SERVER_ERROR,  // 5xx or parse failure
    NETWORK_ERROR  // couldn't reach server
};

struct ScanResponse {
    ScanResult result;
    String     studentName;
    String     sessionName;
    String     message;
    int        httpCode;
};

namespace HttpClient {

static String dynamicApiKey = "";

String getEffectiveApiKey() {
    if (dynamicApiKey.length() > 0) return dynamicApiKey;
    return String(DEVICE_API_KEY);
}

// Send one RFID scan to the backend and return a structured response
ScanResponse scanCard(const String &rfidUid) {
    ScanResponse resp;
    resp.result = ScanResult::NETWORK_ERROR;

    HTTPClient http;
    String url = String(SERVER_BASE_URL) + SCAN_ENDPOINT;

    http.begin(url);
    http.addHeader("Content-Type",  "application/json");
    http.addHeader("X-Device-Key",  getEffectiveApiKey());
    http.addHeader("Connection",    "close");
    http.setTimeout(HTTP_TIMEOUT_MS);

    // Build JSON body
    String body = "{\"rfid_uid\":\"" + rfidUid + "\"}";

    Serial.printf("[HTTP] POST %s  body: %s\n", url.c_str(), body.c_str());

    int code = http.POST(body);
    resp.httpCode = code;

    if (code <= 0) {
        Serial.printf("[HTTP] Network error: %s\n", HTTPClient::errorToString(code).c_str());
        resp.result  = ScanResult::NETWORK_ERROR;
        resp.message = "Cannot reach server";
        http.end();
        return resp;
    }

    String payload = http.getString();
    http.end();

    Serial.printf("[HTTP] Response %d: %s\n", code, payload.c_str());

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload);

    if (code == 200) {
        resp.result      = ScanResult::SUCCESS;
        resp.studentName = doc["student"].as<String>();
        resp.sessionName = doc["session"].as<String>();
        resp.message     = "OK";

    } else if (code == 409) {
        resp.result  = ScanResult::DUPLICATE;
        resp.message = "Already scanned this session";

    } else if (code == 404) {
        // Distinguish "student not found" vs "no active session"
        String detail = err ? "" : doc["detail"].as<String>();
        if (detail.indexOf("session") >= 0 || detail.indexOf("Session") >= 0) {
            resp.result  = ScanResult::NO_SESSION;
            resp.message = "No active session";
        } else {
            resp.result  = ScanResult::UNKNOWN_CARD;
            resp.message = "Card not registered";
        }

    } else if (code == 403) {
        resp.result  = ScanResult::AUTH_FAIL;
        resp.message = "Invalid device API key";

    } else {
        resp.result  = ScanResult::SERVER_ERROR;
        resp.message = "Server error " + String(code);
    }

    return resp;
}

// Simple GET /attendance/heartbeat to verify backend is up and update last_seen
bool checkHealth() {
    HTTPClient http;
    String url = String(SERVER_BASE_URL) + "/attendance/heartbeat";
    http.begin(url);
    http.addHeader("X-Device-Key", getEffectiveApiKey());
    http.setTimeout(5000);
    int code = http.GET();
    http.end();
    return (code == 200);
}

bool startDiscovery() {
    HTTPClient http;
    String mac = WiFi.macAddress();
    String url = String(SERVER_BASE_URL) + PROVISION_ENDPOINT + "?mac=" + mac;
    
    http.begin(url);
    http.setTimeout(5000);
    int code = http.POST("");
    
    if (code == 200) {
        String payload = http.getString();
        JsonDocument doc;
        deserializeJson(doc, payload);
        
        if (doc["status"] == "active") {
            dynamicApiKey = doc["api_key"].as<String>();
            Serial.printf("[IOT] Received API Key: %s\n", dynamicApiKey.c_str());
        } else {
            Serial.println("[IOT] Device pending or unknown.");
        }
        http.end();
        return true;
    }
    http.end();
    return false;
}

} // namespace HttpClient
