// Substituto de Joystick.h para o teste de sessao (controller-session.cpp).
// Mantem o PIDReportHandler e o canal HID reais; troca apenas o transporte USB.
#pragma once
#include <Arduino.h>
#include <DynamicHID/PIDReportHandler.h>
#include <DynamicHID/HidControlChannel.h>
#define JOYSTICK_DEFAULT_REPORT_ID 0x03
#define JOYSTICK_TYPE_JOYSTICK 0x04
struct FakeDynamicHID {
  PIDReportHandler pidReportHandler;
  HidControlChannel controlChannel;
  void (*diagnosticReport)(uint8_t*) = nullptr;
};
FakeDynamicHID& DynamicHID();
class Joystick_ {
public:
  Joystick_(uint8_t, uint8_t, uint8_t, uint8_t, bool, bool, bool, bool, bool, bool, bool, bool, bool, bool, bool) {}
  int32_t x = 0; uint32_t buttons = 0; uint16_t sent = 0;
  void setXAxis(int32_t v) { x = v; }
  void setYAxis(int32_t) {} void setZAxis(int32_t) {} void setRxAxis(int32_t) {}
  void setRyAxis(int32_t) {} void setRzAxis(int32_t) {} void setRudder(int32_t) {}
  void setXAxisRange(int32_t, int32_t) {} void setYAxisRange(int32_t, int32_t) {}
  void setZAxisRange(int32_t, int32_t) {} void setRxAxisRange(int32_t, int32_t) {}
  void setRyAxisRange(int32_t, int32_t) {} void setRzAxisRange(int32_t, int32_t) {}
  void setRudderRange(int32_t, int32_t) {}
  void setButton(uint8_t i, uint8_t v) { if (v) buttons |= 1UL << i; else buttons &= ~(1UL << i); }
  void sendState() { ++sent; }
  void getUSBPID() {}
  void begin(bool) {}
};
