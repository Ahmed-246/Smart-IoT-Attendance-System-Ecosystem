#pragma once
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include "config.h"

namespace RFIDReader {

static MFRC522 mfrc522(RC522_SS_PIN, RC522_RST_PIN);

void setup() {
    SPI.begin();
    mfrc522.PCD_Init();
    mfrc522.PCD_DumpVersionToSerial();
    Serial.println("[RFID] RC522 ready. Waiting for cards…");
}

// Returns true + fills uid_out if a new card is present
// uid_out format: "AABBCCDD" (uppercase hex, no spaces)
bool readCard(String &uid_out) {
    if (!mfrc522.PICC_IsNewCardPresent()) return false;
    if (!mfrc522.PICC_ReadCardSerial())   return false;

    uid_out = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) uid_out += "0";
        uid_out += String(mfrc522.uid.uidByte[i], HEX);
    }
    uid_out.toUpperCase();

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return true;
}

} // namespace RFIDReader
