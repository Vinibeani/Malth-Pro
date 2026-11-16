#pragma once
#include <stdint.h>

namespace Malth {
inline int32_t steeringEffectValue(int32_t value, uint8_t axes) {
  // Um unico atuador X: nao projetar a magnitude por seno de um joystick XY.
  // Direction Enable ignora Axes Enable no PID; a unica direcao fisica e o
  // proprio eixo do volante. Preservar magnitude e sinal.
  return axes & 0x05 ? value : 0;
}
inline int32_t clamp32(int32_t value, int32_t lo, int32_t hi) {
  return value < lo ? lo : value > hi ? hi : value;
}
inline int32_t steeringHalfRange(uint16_t cpr, uint16_t angle) {
  // Arredondar para fora: nunca antecipar o limite por uma fracao de contagem.
  return ((uint32_t)cpr * angle + 719UL) / 720UL;
}
inline int32_t applySteeringStops(int32_t force, int32_t position, int32_t halfRange,
                                  uint16_t cpr, uint8_t hard, uint8_t soft) {
  int32_t absolute = position < 0 ? -position : position;
  if (absolute <= halfRange || !cpr || halfRange < 1) return force;
  uint32_t excess = (uint32_t)clamp32(absolute - halfRange, 0, halfRange);
  uint32_t span = halfRange / 10;
  if (!span) span = 1;
  uint32_t softTravel = excess < span ? excess : span;
  uint32_t gentle = softTravel * soft * 100UL / span;
  // No intervalo valido, o produto cabe em uint32_t, mas nao em int32_t.
  uint32_t firm = excess * hard * 720UL / cpr;
  uint32_t restoring = firm > gentle ? firm : gentle;
  if (restoring > 10000) restoring = 10000;
  if (!restoring) return force;
  int32_t signedForce = position > 0 ? -(int32_t)restoring : (int32_t)restoring;
  // Preservar um efeito restaurador maior; impedir que outro efeito empurre
  // para fora. Ambos os batentes comecam somente alem do limite configurado.
  return position > 0 ? (force < signedForce ? force : signedForce)
                      : (force > signedForce ? force : signedForce);
}
inline uint16_t pedalValue(uint16_t raw, uint16_t lo, uint16_t hi) {
  if (hi == lo) return 0;
  return (uint16_t)clamp32(((int32_t)raw - lo) * 1023L / ((int32_t)hi - lo), 0, 1023);
}
// Dez pontos ajustaveis (10..100%), com origem fixa em 0%.
inline uint16_t brakeValue(uint16_t input, const int16_t* points) {
  if (input >= 1023) return points[9];
  uint32_t scaled = (uint32_t)input * 10;
  uint8_t segment = scaled / 1023;
  int32_t a = segment ? points[segment - 1] : 0;
  int32_t b = points[segment];
  return a + (b - a) * (scaled % 1023) / 1023;
}
// 0=N, 1..7=preview forward gears, 8=R. HID up/down remain game-independent.
inline uint8_t stepSequentialGear(uint8_t gear, uint8_t direction) {
  if (direction == 1) return gear == 8 ? 0 : gear < 7 ? gear + 1 : 7;
  if (direction == 2) return gear == 8 ? 8 : gear == 0 ? 8 : gear - 1;
  return gear;
}
inline uint8_t shifterColumn(uint16_t x, int16_t low, int16_t mid, int16_t high) {
  return x <= low ? 0 : x <= mid ? 1 : x <= high ? 2 : 3;
}
inline int16_t hGear(uint16_t x, uint16_t y, const int16_t* positions,
                     int16_t xLow = 256, int16_t xMid = 512, int16_t xHigh = 768,
                     int16_t yLow = 256, int16_t yHigh = 768) {
  if (y > yLow && y < yHigh) return 0;
  uint8_t column = shifterColumn(x, xLow, xMid, xHigh);
  bool bottom = y >= yHigh;
  int32_t best = 0x7fffffffL, second = best;
  uint8_t gear = 0;
  for (uint8_t i = 0; i < 8; ++i) {
    int16_t px = positions[i * 2], py = positions[i * 2 + 1];
    if (shifterColumn(px, xLow, xMid, xHigh) != column ||
        (bottom ? py < yHigh : py > yLow)) continue;
    int32_t dx = (int32_t)x - positions[i * 2];
    int32_t dy = (int32_t)y - positions[i * 2 + 1];
    int32_t distance = dx * dx + dy * dy;
    if (distance < best) { second = best; best = distance; gear = i + 1; }
    else if (distance < second) second = distance;
  }
  // Uma zona com duas marchas exige nova calibracao; nao gerar engate ambiguo.
  return second == 0x7fffffffL ? gear : 0;
}
inline int32_t lowPass(int32_t previous, int32_t value, uint8_t amount) {
  // 0 = sem filtro; 100 = resposta de aproximadamente 42 ms a 500 Hz.
  return amount == 0 ? value : previous + (value - previous) / (1 + amount / 5);
}
inline int32_t motionRate(int32_t delta, uint32_t dt, int32_t limit) {
  uint32_t factor=dt ? 1000000UL/dt : 0;
  if (!factor) return 0;
  // Limitar antes de multiplicar evita overflow em uma leitura brusca do encoder.
  int32_t boundary=limit/factor;
  if (delta>boundary) return limit;
  if (delta<-boundary) return -limit;
  return delta*(int32_t)factor;
}
inline uint16_t crc16(uint16_t crc, uint8_t value) {
  crc ^= value;
  for (uint8_t bit = 0; bit < 8; ++bit) crc = (crc >> 1) ^ ((crc & 1) ? 0xa001 : 0);
  return crc;
}
}
