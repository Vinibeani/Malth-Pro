#pragma once
#include <stdint.h>

namespace Malth {
// IDs do Malth, distintos dos IDs do firmware de referencia.
// 2 preserva perfis/EEPROM anteriores; 4 identifica a adaptacao BTS.
enum DriveMode : uint8_t {
  TWO_PWM_ENABLE = 2, BTS_PWM_DIR = 4
};
// Bits digitais correspondem a PORTB: D8=PB4, D10=PB6.
struct MotorOutput {
  uint16_t a, b;
  uint8_t digital, channels;
  bool invertA;
};
inline MotorOutput motorOutput(uint8_t mode, bool positive, uint16_t duty) {
  MotorOutput p = {0, 0, 0, 0, false};
  if (!duty) return p;
  switch (mode) {
    case TWO_PWM_ENABLE:
      p.digital = 0x10;
      if (positive) { p.b = duty; p.channels = 2; }
      else { p.a = duty; p.channels = 1; }
      break;
    case BTS_PWM_DIR:
      // D8 segue ENABLE; D9 e PWM; D10 e DIR. No sentido positivo,
      // PWM invertido produz 1-m no pino e somente m no motor (IN_L-IN_R).
      p.a = duty; p.channels = 1; p.digital = positive ? 0x50 : 0x10;
      p.invertA = positive; break;
  }
  return p;
}
inline uint16_t motorSettleMicros(uint16_t frequency) {
  return (2000000UL + frequency - 1) / frequency;
}
// Limits come exclusively from the user's validated profile (0..100%).
inline uint16_t motorMagnitude(uint16_t magnitude, uint8_t minimum, uint8_t maximum) {
  if (!magnitude) return 0;
  uint32_t requested = minimum * 100UL + (uint32_t)magnitude * (100 - minimum) / 100;
  uint16_t limit = maximum * 100U;
  return requested > limit ? limit : requested;
}
inline uint16_t motorCompare(uint16_t top, uint16_t magnitude) {
  // Fast PWM tem pulso de OCR+1 clocks. Arredondar para baixo preserva
  // o teto de magnitude sem exceder a magnitude solicitada pelo perfil.
  uint16_t ticks = (uint32_t)(top + 1) * magnitude / 10000;
  return ticks > 1 ? ticks - 1 : 0;
}
}
