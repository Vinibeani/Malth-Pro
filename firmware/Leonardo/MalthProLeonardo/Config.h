#pragma once
#include <Arduino.h>
#include "ControlMath.h"
#include "MotorOutput.h"

namespace Malth {
// Ordem versionada e compartilhada com desktop/device-protocol.cjs.
enum Register : uint8_t {
  CPR, ANGLE, INVERT, PWM_HZ, DRIVE_MODE, USE_INDEX, PEDAL_MASK,
  ACCEL_MIN, ACCEL_MAX, BRAKE_MIN, BRAKE_MAX, CLUTCH_MIN, CLUTCH_MAX,
  HANDBRAKE_MIN, HANDBRAKE_MAX,
  BRAKE_10, BRAKE_20, BRAKE_30, BRAKE_40, BRAKE_50,
  BRAKE_60, BRAKE_70, BRAKE_80, BRAKE_90, BRAKE_100,
  SHIFTER_MODE, Y_LOW, Y_HIGH, X_LOW, X_MID, X_HIGH,
  GEAR_1_X, GEAR_1_Y, GEAR_2_X, GEAR_2_Y, GEAR_3_X, GEAR_3_Y,
  GEAR_4_X, GEAR_4_Y, GEAR_5_X, GEAR_5_Y, GEAR_6_X, GEAR_6_Y,
  GEAR_7_X, GEAR_7_Y, GEAR_R_X, GEAR_R_Y,
  HARDLOCK, SOFTLOCK, MIN_FORCE, MAX_FORCE, CONSTANT_GAIN, SPRING_GAIN,
  SINE_GAIN, DAMPER_GAIN, FRICTION_GAIN, INERTIA_GAIN,
  DAMPER_FILTER, FRICTION_FILTER, INERTIA_FILTER,
  DESKTOP_EFFECT, DESKTOP_FORCE, CONSTANT_SCALE, SPRING_SCALE, SINE_SCALE,
  REGISTER_COUNT
};
struct Config { int16_t value[REGISTER_COUNT]; };

inline void defaultConfig(Config& c) {
  memset(&c, 0, sizeof(c));
  c.value[CPR] = 4000; c.value[ANGLE] = 540; c.value[PWM_HZ] = 16000;
  c.value[DRIVE_MODE] = 2; c.value[PEDAL_MASK] = 3;
  for (uint8_t p = 0; p < 4; ++p) c.value[ACCEL_MAX + p * 2] = 1023;
  for (uint8_t p = 0; p < 10; ++p) c.value[BRAKE_10 + p] = ((p + 1) * 1023L + 5) / 10;
  c.value[SHIFTER_MODE] = 1;
  c.value[Y_LOW] = c.value[X_LOW] = 256; c.value[Y_HIGH] = c.value[X_HIGH] = 768;
  c.value[X_MID] = 512;
  for (uint8_t p = 0; p < 8; ++p) {
    c.value[GEAR_1_X + p * 2] = 128 + (p / 2) * 256;
    c.value[GEAR_1_Y + p * 2] = p % 2 ? 768 : 256;
  }
  c.value[HARDLOCK] = c.value[SOFTLOCK] = 50;
  c.value[MIN_FORCE] = 5; c.value[MAX_FORCE] = 25;
  c.value[CONSTANT_GAIN] = 70; c.value[FRICTION_GAIN] = 100;
  c.value[SPRING_GAIN] = c.value[SINE_GAIN] = c.value[DAMPER_GAIN] = c.value[INERTIA_GAIN] = 50;
  c.value[DAMPER_FILTER] = c.value[FRICTION_FILTER] = c.value[INERTIA_FILTER] = 20;
  c.value[CONSTANT_SCALE] = c.value[SPRING_SCALE] = c.value[SINE_SCALE] = 50;
  // Escala 50 = Default (1x), 0 = 0,5x, 100 = 1,5x.
}
inline bool validConfig(const Config& c) {
  if (c.value[CPR] < 4 || c.value[CPR] > 32000 || c.value[ANGLE] < 30 || c.value[ANGLE] > 1080 ||
      c.value[PWM_HZ] < 4000 || c.value[PWM_HZ] > 20000 ||
      (c.value[DRIVE_MODE] != TWO_PWM_ENABLE && c.value[DRIVE_MODE] != BTS_PWM_DIR) || c.value[USE_INDEX] != 0 ||
      c.value[INVERT] < 0 || c.value[INVERT] > 1 || c.value[PEDAL_MASK] < 0 || c.value[PEDAL_MASK] > 15) return false;
  for (uint8_t p = 0; p < 4; ++p) {
    int16_t lo = c.value[ACCEL_MIN + p * 2], hi = c.value[ACCEL_MAX + p * 2];
    if (lo < 0 || hi > 1023 || lo >= hi) return false;
  }
  int16_t previous = 0;
  for (uint8_t p = BRAKE_10; p <= BRAKE_100; ++p) {
    if (c.value[p] < previous || c.value[p] > 1023) return false;
    previous = c.value[p];
  }
  if (c.value[SHIFTER_MODE] < 0 || c.value[SHIFTER_MODE] > 1) return false;
  for (uint8_t p = Y_LOW; p <= GEAR_R_Y; ++p) if (c.value[p] < 0 || c.value[p] > 1023) return false;
  if (c.value[Y_LOW] >= c.value[Y_HIGH] || c.value[X_LOW] >= c.value[X_MID] || c.value[X_MID] >= c.value[X_HIGH]) return false;
  for (uint8_t p = HARDLOCK; p < REGISTER_COUNT; ++p) if (c.value[p] < 0 || c.value[p] > 100) return false;
  return c.value[MIN_FORCE] <= c.value[MAX_FORCE] && c.value[DESKTOP_EFFECT] <= 3;
}
inline uint16_t configCrc(const Config& c) {
  uint16_t crc = 0xffff;
  const uint8_t* bytes = reinterpret_cast<const uint8_t*>(&c);
  for (uint16_t i = 0; i < sizeof(c); ++i) crc = crc16(crc, bytes[i]);
  return crc;
}
}
