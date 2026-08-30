#pragma once
#include <Arduino.h>
#include "config.h"

// Tracks the last-seen UID + timestamp.
// Returns true if the card is allowed to scan (cooldown elapsed).
// Prevents double-reads when a card is held near the reader.

namespace Cooldown {

static String  _lastUID  = "";
static unsigned long _lastTime = 0;

bool allow(const String &uid) {
    unsigned long now = millis();
    if (uid == _lastUID && (now - _lastTime) < SCAN_COOLDOWN_MS) {
        return false;   // same card, too soon
    }
    _lastUID  = uid;
    _lastTime = now;
    return true;
}

void reset() {
    _lastUID  = "";
    _lastTime = 0;
}

} // namespace Cooldown
