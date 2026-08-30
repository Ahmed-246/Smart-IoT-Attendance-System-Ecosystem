#pragma once
#include <Arduino.h>
#include "config.h"

// ─── LED + Buzzer feedback ────────────────────────────────────────────────
// Call once in setup(), then use the signal_*() helpers anywhere.

namespace LED {

void setup() {
    pinMode(LED_GREEN_PIN, OUTPUT);
    pinMode(LED_RED_PIN,   OUTPUT);
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_RED_PIN,   LOW);
#if BUZZER_ENABLED
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
#endif
}

inline void _buzz(int freq, int ms) {
#if BUZZER_ENABLED
    tone(BUZZER_PIN, freq);
    delay(ms);
    noTone(BUZZER_PIN);
#endif
}

// ── Single flash helper ──────────────────────────────────────────────
void flash(int pin, int times, int on_ms = 150, int off_ms = 100) {
    for (int i = 0; i < times; i++) {
        digitalWrite(pin, HIGH);
        delay(on_ms);
        digitalWrite(pin, LOW);
        if (i < times - 1) delay(off_ms);
    }
}

// ── Named signals ────────────────────────────────────────────────────

// Green: attendance recorded successfully
void success() {
    digitalWrite(LED_GREEN_PIN, HIGH);
    
    // User's success melody
    _buzz(3500, 300);
    delay(150);
    _buzz(4000, 250);
    delay(500);

    digitalWrite(LED_GREEN_PIN, LOW);
}

// Red: something went wrong (duplicate, no session, etc.)
void error() {
    digitalWrite(LED_RED_PIN, HIGH);
    _buzz(3500, 2000); // 2 second error beep
    digitalWrite(LED_RED_PIN, LOW);
}

// Amber: waiting / processing (alternate green+red quickly)
void thinking() {
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_GREEN_PIN, HIGH);
        delay(60);
        digitalWrite(LED_GREEN_PIN, LOW);
        digitalWrite(LED_RED_PIN,   HIGH);
        delay(60);
        digitalWrite(LED_RED_PIN, LOW);
    }
}

// Both on steady = WiFi connecting
void wifiConnecting() {
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_RED_PIN,   HIGH);
}

// Green steady = WiFi connected, ready
void ready() {
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(LED_RED_PIN,   LOW);
}

// Duplicate scan (already recorded) — slow amber blink
void duplicate() {
    for (int i = 0; i < 2; i++) {
        digitalWrite(LED_GREEN_PIN, HIGH);
        digitalWrite(LED_RED_PIN,   HIGH);
        delay(300);
        digitalWrite(LED_GREEN_PIN, LOW);
        digitalWrite(LED_RED_PIN,   LOW);
        delay(150);
    }
    _buzz(600, 150);
}

void allOff() {
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_RED_PIN,   LOW);
}

} // namespace LED
