#include "Config.h"
// Modelo de contagem do PWM: nao simula a ponte, motor ou temporizacao USB.
volatile uint8_t testResult[3];
static uint8_t cases = 0, failures = 0;
static void check(bool passed) { ++cases; if (!passed) ++failures; }
int main() {
  using namespace Malth;
  Config config; defaultConfig(config);
  check(validConfig(config));
  check(config.value[MIN_FORCE] == 0 && config.value[MAX_FORCE] == 100);
  check(motorMagnitude(1, 0, 100) == 1);
  check(motorMagnitude(0, 100, 100) == 0);
  check(motorMagnitude(5000, 0, 100) == 5000);
  check(motorMagnitude(10000, 0, 100) == 10000);
  check(motorMagnitude(10000, 0, 50) == 5000);
  check(motorMagnitude(10000, 0, 0) == 0);
  check(motorMagnitude(1000, 10, 100) == 1900);
  check(motorMagnitude(5000, 0, 25) == 2500); // User-chosen value, not a fixed cap.

  config.value[DRIVE_MODE] = BTS_PWM_DIR; check(validConfig(config));
  for (uint8_t mode = 0; mode < 6; ++mode) {
    config.value[DRIVE_MODE] = mode;
    check(validConfig(config) == (mode == TWO_PWM_ENABLE || mode == BTS_PWM_DIR));
  }
  for (uint16_t frequency = 4000; frequency <= 20000; frequency += 1000) {
    uint16_t top = 16000000UL / frequency - 1, period = top + 1;
    check(motorSettleMicros(frequency) * (uint32_t)frequency >= 2000000UL);
    check(motorSettleMicros(frequency) <= 500);
    for (uint8_t mode = TWO_PWM_ENABLE; mode <= BTS_PWM_DIR; mode += 2) {
      bool passed = true;
      for (uint8_t direction = 0; direction < 2; ++direction) {
        MotorOutput off = motorOutput(mode, direction, 0);
        if (off.a || off.b || off.digital || off.channels || off.invertA) passed = false;
        for (uint16_t magnitude = 1; magnitude <= 10000; magnitude += 37) {
          uint16_t duty = motorCompare(top, magnitude);
          MotorOutput p = motorOutput(mode, direction, duty);
          if (!duty) continue;
          uint16_t left = p.channels & 1 ? (p.invertA ? period - p.a - 1 : p.a + 1) : 0;
          uint16_t right = p.channels & 2 ? p.b + 1 : (p.digital & 0x40 ? period : 0);
          int16_t motor = (int16_t)right - left;
          int16_t expected = direction ? duty + 1 : -(int16_t)(duty + 1);
          if (!(p.digital & 0x10) || motor != expected || (uint32_t)(duty + 1) * 10000UL > (uint32_t)period * magnitude) passed = false;
          if (mode == BTS_PWM_DIR && (p.channels != 1 || p.b || p.invertA != (bool)direction)) passed = false;
          if (mode == TWO_PWM_ENABLE && (p.invertA || p.digital != 0x10 || (p.a && p.b))) passed = false;
        }
      }
      check(passed);
    }
  }
  for (uint8_t mode = TWO_PWM_ENABLE; mode <= BTS_PWM_DIR; mode += 2) {
    uint16_t full = motorCompare(999, motorMagnitude(10000, 0, 100));
    check(full == 999);
    check(motorOutput(mode, false, full).a == 999);
    check(motorOutput(mode, true, full).digital & 0x10);
  }
  check(motorSettleMicros(4000) == 500 && motorSettleMicros(20000) == 100);
  check((uint32_t)(20UL - 0xfffffff0UL) == 36);
  testResult[1] = cases; testResult[2] = failures; testResult[0] = 0xa5;
  for (;;) {}
}
