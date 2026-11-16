#pragma once
#include <stdint.h>
#include <string.h>

// Canal de configuracao proprio, separado dos IDs PID usados pelos jogos.
// Feature 0x40: ID, tamanho (0..62), bytes; respostas JSON podem ocupar varios reports.
class HidControlChannel {
public:
  static const uint8_t REPORT_ID = 0x40, REPORT_SIZE = 64, PAYLOAD_SIZE = 62;
  bool accept(const uint8_t* report, uint8_t size) {
    if (size != REPORT_SIZE || report[0] != REPORT_ID || report[1] < 2 ||
        report[1] > PAYLOAD_SIZE || incomingLength) return false;
    uint8_t length = report[1];
    if (report[length + 1] != '\n') return false;
    for (uint8_t i = 0; i + 1 < length; ++i)
      if (report[i + 2] < 32 || report[i + 2] > 126) return false;
    memcpy(incoming, report + 2, length - 1);
    incoming[length - 1] = 0;
    incomingLength = length;
    return true;
  }
  bool read(char* destination) {
    if (!incomingLength) return false;
    memcpy(destination, incoming, incomingLength);
    incomingLength = 0;
    return true;
  }
  bool pending() const { return outgoingLength != 0; }
  bool publish(const char* data, uint8_t size) {
    if (pending()) return false;
    outgoing = data; outgoingOffset = 0; outgoingLength = size;
    return true;
  }
  void report(uint8_t* destination) {
    memset(destination, 0, REPORT_SIZE); destination[0] = REPORT_ID;
    uint8_t remaining = outgoingLength - outgoingOffset;
    uint8_t size = remaining < PAYLOAD_SIZE ? remaining : PAYLOAD_SIZE;
    destination[1] = size;
    if (size) memcpy(destination + 2, outgoing + outgoingOffset, size);
    outgoingOffset += size;
    if (outgoingOffset == outgoingLength) outgoingLength = outgoingOffset = 0;
  }
  void clear() { incomingLength = outgoingLength = outgoingOffset = 0; }
private:
  char incoming[PAYLOAD_SIZE] = {};
  volatile uint8_t incomingLength = 0, outgoingLength = 0, outgoingOffset = 0;
  const char* outgoing = nullptr;
};
