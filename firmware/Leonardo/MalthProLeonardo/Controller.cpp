#include "Controller.h"
#include "Config.h"
#include <Joystick.h>
#include <EEPROM.h>
#include <avr/eeprom.h>
#include <avr/interrupt.h>
#include <avr/wdt.h>
#include <util/atomic.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>

using namespace Malth;

// D8 = R_EN + L_EN; D9 = LPWM; D10 = RPWM. Nao usar analogWrite nestes pinos.
static const uint8_t ENABLE_PIN = 8, LEFT_PWM = 9, RIGHT_PWM = 10;
static const uint8_t analogPins[] = {A0, A1, A2, A3, A4, A5};
static const uint8_t matrixColumns[] = {12, 7, 6, 5};
static const uint8_t matrixRows[] = {4, 14, 15, 16};
// Limite da primeira imagem de bancada. Aumentar somente depois de validar o sentido do motor.
static const uint8_t BENCH_MOTOR_LIMIT_PERCENT = 25;
static const int8_t MOTOR_DIRECTION = 1;
static const uint16_t CONTROL_US = 2000;
static const uint8_t EEPROM_SCHEMA = 1;

Joystick_ wheel(JOYSTICK_DEFAULT_REPORT_ID, JOYSTICK_TYPE_JOYSTICK, 32, 0,
               true, true, true, true, true, true, true, false, false, false, false);
static Config config, staging;
static volatile int32_t encoderCount = 0;
static volatile uint8_t encoderState, loopMissed = 0;
static int32_t encoderCenter = 0, previousPosition = 0;
static int32_t velocity = 0, previousVelocity = 0, acceleration = 0, friction = 0;
static uint16_t raw[6];
static int16_t normalizedSteering = 0;
static uint8_t gear = 0, sequentialLatch = 0;
static bool centered = false, armed = false, transaction = false, serialSession = false;
static uint8_t nextRegister = 0;
static uint16_t overruns = 0;
static uint32_t lastControl = 0, lastTelemetry = 0, lastHostPing = 0;
static uint32_t matrixButtons = 0;
static uint8_t debounce[16] = {}, matrixRow = 0;
static volatile uint8_t motorMode = 0xff, motorPositive = 0, motorSettling = 0;
static uint32_t motorStageTime = 0;

// Comunicacao limitada: nenhuma linha JSON do perfil inteiro e alocada no AVR.
static char inputLine[80], tx[176], reply[112];
static uint8_t inputLength = 0, txLength = 0, txOffset = 0;
static bool droppingLine = false;

static const uint16_t RECORD_BYTES = sizeof(Config) + 6;
static uint16_t generation = 0, saveIndex = 0;
static uint8_t savedSlot = 1, saveSlot = 0;
static bool saving = false;

static void motorOff() {
  PORTB &= ~_BV(4); // D8 baixo antes de qualquer mudanca no PWM.
  PORTB &= ~(_BV(5) | _BV(6)); // Precarregar LOW antes de devolver os pinos ao GPIO.
  TCCR1A = _BV(WGM11);
  OCR1A = OCR1B = 0;
  motorMode = 0xff; motorSettling = 0;
}

// Receptor PID independente do ritmo da interface. Sem calculos de torque na ISR.
ISR(TIMER3_COMPA_vect) {
  if (loopMissed < 255) ++loopMissed;
  if (loopMissed >= 20) motorOff();
  wheel.getUSBPID();
}

static void encoderInterrupt() {
  static const int8_t transitions[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};
  uint8_t current = (PIND >> 2) & 3; // D0=PD2(A), D1=PD3(B).
  encoderCount += transitions[(encoderState << 2) | current];
  encoderState = current;
}

static int32_t readPosition() {
  int32_t count;
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { count = encoderCount; }
  count -= encoderCenter;
  return config.value[INVERT] ? -count : count;
}

static void configurePwm() {
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    motorOff();
    TCCR1B = 0;
    TCNT1 = 0;
    ICR1 = F_CPU / (uint32_t)config.value[PWM_HZ] - 1;
    TCCR1A = _BV(WGM11);
    TCCR1B = _BV(WGM13) | _BV(WGM12) | _BV(CS10);
  }
}

static void writeMotor(int32_t force) {
  auto& pid = DynamicHID().pidReportHandler;
  if (!armed || !centered || !USBDevice.configured() || pid.devicePaused ||
      !(pid.pidState.status & 2) || loopMissed >= 20) { motorOff(); return; }
  force = clamp32(force, -10000, 10000);
  if (force == 0) { motorOff(); return; }
  int32_t magnitude = force < 0 ? -force : force;
  magnitude = config.value[MIN_FORCE] * 100L + magnitude * (100 - config.value[MIN_FORCE]) / 100;
  int32_t limit = min((int16_t)BENCH_MOTOR_LIMIT_PERCENT, config.value[MAX_FORCE]) * 100L;
  magnitude = min(magnitude, limit);
  if (!magnitude) { motorOff(); return; }
  force *= MOTOR_DIRECTION * (config.value[INVERT] ? -1 : 1);
  uint8_t mode = config.value[DRIVE_MODE];
  bool positive = force > 0;
  uint16_t duty = motorCompare(ICR1, magnitude);
  if (!duty) { motorOff(); return; }
  MotorOutput output = motorOutput(mode, positive, duty);
  uint8_t compare = _BV(WGM11) | (output.channels & 1 ? _BV(COM1A1) : 0) |
    (output.channels & 2 ? _BV(COM1B1) : 0) | (output.invertA ? _BV(COM1A0) : 0);
  uint32_t now = micros();
  uint16_t settleMicros = motorSettleMicros(config.value[PWM_HZ]);
  // COM atua imediatamente; OCR e duplamente bufferizado. D8 permanece
  // baixo por dois periodos completos antes de habilitar nova polaridade.
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    if (loopMissed >= 20 || !USBDevice.configured() || pid.devicePaused || !(pid.pidState.status & 2)) motorOff();
    else if (motorMode != mode || motorPositive != positive) {
      motorOff();
      PORTB = (PORTB & ~(_BV(4) | _BV(5) | _BV(6))) | (output.digital & _BV(6));
      OCR1A = output.a; OCR1B = output.b;
      TCCR1A = compare;
      motorMode = mode; motorPositive = positive;
      motorStageTime = micros(); motorSettling = 1;
    } else if (!motorSettling || (uint32_t)(now - motorStageTime) >= settleMicros) {
      // Durante o assentamento os OCR ficam congelados. Depois, so muda
      // a magnitude: nao desconectar o PWM nem limpar DIR a cada controle.
      OCR1A = output.a; OCR1B = output.b;
      PORTB |= _BV(4);
      motorSettling = 0;
    }
  }
}

static int32_t conditionForce(const TEffectCondition& c, int32_t metric) {
  int32_t delta = metric - c.cpOffset;
  if (delta > c.deadBand) {
    return -min((delta - c.deadBand) * (int32_t)c.positiveCoefficient / 10000,
                (int32_t)c.positiveSaturation);
  }
  if (delta < -(int32_t)c.deadBand) {
    return -max((delta + c.deadBand) * (int32_t)c.negativeCoefficient / 10000,
                -(int32_t)c.negativeSaturation);
  }
  return 0;
}

static int32_t calculateForce(int32_t position, int32_t halfRange, uint32_t now, uint32_t dt) {
  auto& pid = DynamicHID().pidReportHandler;
  int32_t delta = position - previousPosition;
  int32_t speed = clamp32(delta * (1000000L / (int32_t)dt), -1000000, 1000000);
  velocity = lowPass(velocity, speed, config.value[DAMPER_FILTER]);
  acceleration = lowPass(acceleration, clamp32((velocity - previousVelocity) *
                         (1000000L / (int32_t)dt), -10000000, 10000000), config.value[INERTIA_FILTER]);
  friction = lowPass(friction, delta > 0 ? 10000 : delta < 0 ? -10000 : 0, config.value[FRICTION_FILTER]);
  previousPosition = position; previousVelocity = velocity;
  int32_t total = 0;
  for (uint8_t id = 1; id <= MAX_EFFECTS; ++id) {
    TEffectState e;
    ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { memcpy(&e, (const void*)&pid.g_EffectStates[id], sizeof(e)); }
    if (e.state != MEFFECTSTATE_PLAYING) continue;
    uint32_t elapsed = now - (uint32_t)e.startTime;
    bool infinite = e.duration == USB_DURATION_INFINITE || e.duration == 0xffff;
    if (!infinite && e.loopCount != 0xff && elapsed > e.duration * max((uint8_t)1, e.loopCount)) continue;
    if (!infinite && e.duration) elapsed %= e.duration;
    int32_t value = 0;
    uint8_t gain = 100;
    if (e.effectType >= USB_EFFECT_SPRING && e.effectType <= USB_EFFECT_FRICTION) {
      int32_t metric;
      if (e.effectType == USB_EFFECT_SPRING) {
        metric = clamp32(position, -halfRange, halfRange) * 10000L / halfRange;
        gain = config.value[SPRING_GAIN];
        gain = (int32_t)gain * (50 + config.value[SPRING_SCALE]) / 100;
      } else if (e.effectType == USB_EFFECT_DAMPER) {
        metric = clamp32(velocity, -config.value[CPR] * 2L, config.value[CPR] * 2L) * 5000L / config.value[CPR];
        gain = config.value[DAMPER_GAIN];
      } else if (e.effectType == USB_EFFECT_INERTIA) {
        metric = clamp32(acceleration, -config.value[CPR] * 10L, config.value[CPR] * 10L) * 1000L / config.value[CPR];
        gain = config.value[INERTIA_GAIN];
      } else { metric = friction; gain = config.value[FRICTION_GAIN]; }
      value = conditionForce(e.conditions[0], metric);
    } else {
      uint16_t period = max((uint16_t)1, e.period);
      uint32_t phase = ((elapsed % period) * 10000L / period + (uint32_t)e.phase * 10000L / 36000) % 10000;
      int32_t wave = 0;
      switch (e.effectType) {
        case USB_EFFECT_CONSTANT: value = e.magnitude; gain = config.value[CONSTANT_GAIN];
          gain = (int32_t)gain * (50 + config.value[CONSTANT_SCALE]) / 100; break;
        case USB_EFFECT_RAMP: value = e.startMagnitude + (int32_t)(e.endMagnitude - e.startMagnitude) *
          min(elapsed, (uint32_t)e.duration) / max((uint32_t)1, (uint32_t)e.duration); break;
        case USB_EFFECT_SINE: wave = sin(phase * 0.00062831853f) * 10000;
          gain = config.value[SINE_GAIN]; gain = (int32_t)gain * (50 + config.value[SINE_SCALE]) / 100; break;
        case USB_EFFECT_SQUARE: wave = phase < 5000 ? 10000 : -10000; break;
        case USB_EFFECT_TRIANGLE: wave = phase < 5000 ? -10000 + phase * 4L : 30000 - phase * 4L; break;
        case USB_EFFECT_SAWTOOTHUP: wave = -10000 + phase * 2L; break;
        case USB_EFFECT_SAWTOOTHDOWN: wave = 10000 - phase * 2L; break;
        default: continue;
      }
      if (e.effectType >= USB_EFFECT_SQUARE) value = e.offset + (int32_t)e.magnitude * wave / 10000;
      int32_t level = abs(e.magnitude);
      int32_t envelope = level;
      if (e.attackTime && elapsed < e.attackTime) envelope = e.attackLevel + (level - e.attackLevel) * (int32_t)elapsed / e.attackTime;
      if (!infinite && e.fadeTime && elapsed <= e.duration &&
          e.duration - elapsed < e.fadeTime) envelope = e.fadeLevel + (level - e.fadeLevel) * (int32_t)(e.duration - elapsed) / e.fadeTime;
      if (level) value = value * envelope / level;
    }
    if (e.enableAxis & DIRECTION_ENABLE) value = value * sin(e.directionX * 0.024639942f);
    else if (!(e.enableAxis & X_AXIS_ENABLE)) continue;
    total += value * (int32_t)e.gain / 255 * gain / 100;
  }
  total = total * pid.deviceGain.gain / 255;
  if (config.value[DESKTOP_EFFECT] == 1) total -= clamp32(position, -halfRange, halfRange) * config.value[DESKTOP_FORCE] * 100L / halfRange;
  if (config.value[DESKTOP_EFFECT] == 2) total -= clamp32(velocity, -config.value[CPR] * 2L, config.value[CPR] * 2L) * config.value[DESKTOP_FORCE] / config.value[CPR];
  if (config.value[DESKTOP_EFFECT] == 3) total -= friction * config.value[DESKTOP_FORCE] / 100;
  int32_t absolute = abs(position);
  int8_t sign = position >= 0 ? 1 : -1;
  if (absolute > halfRange) {
    int32_t restoring = min(10000L, (absolute - halfRange) * config.value[HARDLOCK] * 720L / config.value[CPR]);
    total = sign > 0 ? min(total, -restoring) : max(total, restoring);
  } else if (absolute > halfRange * 9 / 10) {
    total -= sign * (absolute - halfRange * 9 / 10) * config.value[SOFTLOCK] * 100L / max(1L, halfRange / 10);
  }
  return clamp32(total, -10000, 10000);
}

static void scanMatrix() {
  uint8_t row = matrixRow;
  pinMode(matrixRows[row], OUTPUT); digitalWrite(matrixRows[row], LOW);
  // digitalRead/pinMode anteriores garantem tempo de assentamento, sem delay.
  for (uint8_t col = 0; col < 4; ++col) {
    uint8_t i = row * 4 + col;
    bool down = digitalRead(matrixColumns[col]) == LOW;
    if (down) { if (debounce[i] < 3) ++debounce[i]; }
    else if (debounce[i]) --debounce[i];
    if (debounce[i] == 3) matrixButtons |= 1UL << i;
    if (debounce[i] == 0) matrixButtons &= ~(1UL << i);
  }
  pinMode(matrixRows[row], INPUT);
  matrixRow = (row + 1) & 3;
}

static void reportInputs(int32_t position, int32_t halfRange) {
  for (uint8_t i = 0; i < 6; ++i) raw[i] = analogRead(analogPins[i]);
  normalizedSteering = (int64_t)clamp32(position, -halfRange, halfRange) * 32767L / halfRange;
  wheel.setXAxis(normalizedSteering);
  uint16_t pedals[4];
  for (uint8_t i = 0; i < 4; ++i) {
    pedals[i] = config.value[PEDAL_MASK] & (1 << i) ?
      pedalValue(raw[i], config.value[ACCEL_MIN + i * 2], config.value[ACCEL_MAX + i * 2]) : 0;
  }
  pedals[1] = brakeValue(pedals[1], &config.value[BRAKE_10]);
  wheel.setYAxis(pedals[0]); wheel.setZAxis(pedals[1]);
  wheel.setRxAxis(pedals[2]); wheel.setRyAxis(pedals[3]);
  wheel.setRzAxis(raw[4]); wheel.setRudder(raw[5]);
  scanMatrix();
  for (uint8_t i = 0; i < 16; ++i) wheel.setButton(i, (matrixButtons >> i) & 1);
  if (config.value[SHIFTER_MODE]) {
    gear = hGear(raw[4], raw[5], &config.value[GEAR_1_X], config.value[X_LOW], config.value[X_MID],
                 config.value[X_HIGH], config.value[Y_LOW], config.value[Y_HIGH]);
  } else {
    uint8_t direction = raw[5] <= config.value[Y_LOW] ? 1 : raw[5] >= config.value[Y_HIGH] ? 2 : 0;
    if (direction && !sequentialLatch) {
      if (direction == 1 && gear < 7) ++gear;
      if (direction == 2 && gear > 0) --gear;
    }
    sequentialLatch = direction;
    wheel.setButton(24, direction == 1); wheel.setButton(25, direction == 2);
  }
  for (uint8_t i = 0; i < 8; ++i) wheel.setButton(16 + i, config.value[SHIFTER_MODE] && gear == i + 1);
  if (config.value[SHIFTER_MODE]) { wheel.setButton(24, 0); wheel.setButton(25, 0); }
  wheel.sendState();
}

static void queueReply(const __FlashStringHelper* message) {
  strncpy_P(reply, (PGM_P)message, sizeof(reply) - 1); reply[sizeof(reply) - 1] = 0;
}
static void ack(const char* command) {
  snprintf_P(reply, sizeof(reply), PSTR("{\"type\":\"ack\",\"cmd\":\"%s\"}\n"), command);
}
static void disarm() { armed = false; motorOff(); }
static uint16_t recordCrc(const Config& c, uint16_t gen) {
  return crc16(crc16(configCrc(c), gen & 255), gen >> 8);
}
static void loadSavedConfig() {
  defaultConfig(config);
  bool loaded = false;
  for (uint8_t slot = 0; slot < 2; ++slot) {
    uint16_t base = slot * RECORD_BYTES;
    if (EEPROM.read(base + RECORD_BYTES - 1) != 0xa5 || EEPROM.read(base + RECORD_BYTES - 2) != EEPROM_SCHEMA) continue;
    uint16_t gen, crc;
    EEPROM.get(base, staging);
    EEPROM.get(base + sizeof(Config), gen); EEPROM.get(base + sizeof(Config) + 2, crc);
    if (crc != recordCrc(staging, gen)) continue;
    // Preservar os demais ajustes de um perfil valido da versao anterior.
    if (staging.value[ANGLE] > 1080 && staging.value[ANGLE] <= 2160) staging.value[ANGLE] = 1080;
    if (validConfig(staging) &&
        (!loaded || (int16_t)(gen - generation) > 0)) {
      config = staging; generation = gen; savedSlot = slot; loaded = true;
    }
  }
}

static void serviceSave() {
  if (!saving || !eeprom_is_ready()) return;
  uint16_t base = saveSlot * RECORD_BYTES;
  uint8_t value;
  uint16_t address;
  if (saveIndex == 0) { address = base + RECORD_BYTES - 1; value = 0; }
  else if (saveIndex <= sizeof(Config)) {
    address = base + saveIndex - 1; value = reinterpret_cast<const uint8_t*>(&staging)[saveIndex - 1];
  } else if (saveIndex <= sizeof(Config) + 2) {
    address = base + saveIndex - 1; value = generation >> (8 * (saveIndex - sizeof(Config) - 1));
  } else if (saveIndex <= sizeof(Config) + 4) {
    address = base + saveIndex - 1; value = recordCrc(staging, generation) >> (8 * (saveIndex - sizeof(Config) - 3));
  } else if (saveIndex == sizeof(Config) + 5) { address = base + RECORD_BYTES - 2; value = EEPROM_SCHEMA; }
  else { address = base + RECORD_BYTES - 1; value = 0xa5; }
  eeprom_update_byte((uint8_t*)address, value);
  if (++saveIndex > RECORD_BYTES) { saving = false; savedSlot = saveSlot; ack("SAVE"); }
}

static void command(char* line) {
  char* state;
  char* op = strtok_r(line, " ", &state);
  if (!op) return;
  if (!strcmp(op, "HELLO")) {
    char* version = strtok_r(nullptr, " ", &state);
    if (!version || strcmp(version, "2")) { queueReply(F("{\"type\":\"error\",\"code\":\"PROTOCOL\"}\n")); return; }
    disarm(); serialSession = true; lastHostPing = millis();
    queueReply(F("{\"type\":\"hello\",\"device\":\"MalthPro\",\"protocol\":2,\"firmware\":\"0.1.2\",\"registers\":65,\"btsPwmDir\":1}\n")); return;
  }
  if (!serialSession) { queueReply(F("{\"type\":\"error\",\"code\":\"HELLO_REQUIRED\"}\n")); return; }
  if (!strcmp(op, "PING")) { lastHostPing = millis(); ack(op); return; }
  if (!strcmp(op, "DISARM")) { disarm(); ack(op); return; }
  if (saving) { queueReply(F("{\"type\":\"error\",\"code\":\"SAVING\"}\n")); return; }
  if (!strcmp(op, "BEGIN")) { disarm(); staging = config; nextRegister = 0; transaction = true; ack(op); return; }
  if (!strcmp(op, "SET") && transaction) {
    char* token = strtok_r(nullptr, " ", &state);
    if (!token || atoi(token) != nextRegister) { transaction = false; queueReply(F("{\"type\":\"error\",\"code\":\"ORDER\"}\n")); return; }
    bool received = false;
    while ((token = strtok_r(nullptr, " ", &state))) {
      char* end;
      long value = strtol(token, &end, 10);
      if (*end || value < -32768 || value > 32767 || nextRegister >= REGISTER_COUNT) {
        transaction = false; queueReply(F("{\"type\":\"error\",\"code\":\"VALUE\"}\n")); return;
      }
      staging.value[nextRegister++] = value; received = true;
    }
    if (received) ack(op); else queueReply(F("{\"type\":\"error\",\"code\":\"EMPTY\"}\n"));
    return;
  }
  if (!strcmp(op, "COMMIT")) {
    if (!transaction || nextRegister != REGISTER_COUNT || !validConfig(staging)) {
      transaction = false; queueReply(F("{\"type\":\"error\",\"code\":\"CONFIG\"}\n")); return;
    }
    bool resetCenter = config.value[CPR] != staging.value[CPR] || config.value[INVERT] != staging.value[INVERT];
    config = staging; transaction = false; configurePwm();
    if (resetCenter) centered = false;
    gear = sequentialLatch = 0;
    previousPosition = readPosition(); previousVelocity = velocity = acceleration = friction = 0;
    ack(op); return;
  }
  if (!strcmp(op, "SAVE") && !transaction) {
    disarm(); staging = config; ++generation; saveSlot = savedSlot ^ 1; saveIndex = 0; saving = true; return;
  }
  if (!strcmp(op, "CENTER") && !transaction) {
    disarm(); ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { encoderCenter = encoderCount; }
    previousPosition = previousVelocity = velocity = acceleration = friction = 0;
    centered = true; ack(op); return;
  }
  if (!strcmp(op, "ARM") && !transaction && centered) {
    lastHostPing = millis(); loopMissed = 0; armed = true;
    DynamicHID().pidReportHandler.pidState.status |= 2;
    ack(op); return;
  }
  queueReply(F("{\"type\":\"error\",\"code\":\"COMMAND_OR_CENTER_REQUIRED\"}\n"));
}

static void serviceSerial() {
  // Serial::operator bool() no core AVR espera 10 ms; dtr() e imediato.
  if (!Serial.dtr()) { if (serialSession) disarm(); serialSession = false; txLength = txOffset = inputLength = 0; reply[0] = 0; return; }
  if (armed && millis() - lastHostPing > 2000) disarm();
  // Consome no maximo 32 bytes por volta, preservando o tempo das entradas/FFB.
  for (uint8_t budget = 0; budget < 32 && Serial.available() && !reply[0] && !saving; ++budget) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      if (droppingLine) queueReply(F("{\"type\":\"error\",\"code\":\"LINE_TOO_LONG\"}\n"));
      else { inputLine[inputLength] = 0; command(inputLine); }
      inputLength = 0; droppingLine = false;
    } else if (inputLength < sizeof(inputLine) - 1 && !droppingLine) inputLine[inputLength++] = c;
    else droppingLine = true;
  }
  if (txOffset >= txLength) {
    txLength = txOffset = 0;
    if (reply[0]) { strncpy(tx, reply, sizeof(tx)); txLength = strlen(tx); reply[0] = 0; }
    else if (serialSession && millis() - lastTelemetry >= 32) {
      lastTelemetry = millis();
      txLength = snprintf_P(tx, sizeof(tx), PSTR("{\"type\":\"state\",\"raw\":[%u,%u,%u,%u,%u,%u],\"steering\":%d,\"gear\":%u,\"armed\":%u,\"centered\":%u,\"overruns\":%u,\"buttons\":%u}\n"),
        raw[0], raw[1], raw[2], raw[3], raw[4], raw[5], normalizedSteering, gear, armed, centered, overruns, (uint16_t)matrixButtons);
    }
  }
  if (txOffset < txLength && Serial.availableForWrite() >= 16) {
    uint8_t size = min((uint8_t)16, (uint8_t)(txLength - txOffset));
    Serial.write((uint8_t*)tx + txOffset, size); txOffset += size;
  }
}

void malthBegin() {
  wdt_disable();
  pinMode(ENABLE_PIN, OUTPUT); pinMode(LEFT_PWM, OUTPUT); pinMode(RIGHT_PWM, OUTPUT); motorOff();
  pinMode(0, INPUT_PULLUP); pinMode(1, INPUT_PULLUP);
  encoderState = (PIND >> 2) & 3;
  attachInterrupt(digitalPinToInterrupt(0), encoderInterrupt, CHANGE);
  attachInterrupt(digitalPinToInterrupt(1), encoderInterrupt, CHANGE);
  for (uint8_t i = 0; i < 4; ++i) { pinMode(matrixColumns[i], INPUT_PULLUP); pinMode(matrixRows[i], INPUT); }
  loadSavedConfig(); configurePwm();
  wheel.setXAxisRange(-32767, 32767);
  wheel.setYAxisRange(0, 1023); wheel.setZAxisRange(0, 1023);
  wheel.setRxAxisRange(0, 1023); wheel.setRyAxisRange(0, 1023);
  wheel.setRzAxisRange(0, 1023); wheel.setRudderRange(0, 1023);
  wheel.begin(false);
  DynamicHID().pidReportHandler.deviceGain.gain = 255;
  DynamicHID().pidReportHandler.pidState.status = 0x14;
  Serial.begin(115200);
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    TCCR3A = TCCR3B = 0; TCNT3 = 0;
    OCR3A = F_CPU / 8 / 1000 - 1;
    TCCR3B = _BV(WGM32) | _BV(CS31); TIMSK3 = _BV(OCIE3A);
  }
  lastControl = micros(); wdt_enable(WDTO_250MS);
}

void malthLoop() {
  wdt_reset();
  if (!USBDevice.configured()) { disarm(); centered = false; }
  uint32_t now = micros(), dt = now - lastControl;
  if (dt >= CONTROL_US) {
    lastControl = now;
    if (dt > 5000 && overruns < 65535) ++overruns;
    if (loopMissed >= 20) disarm();
    loopMissed = 0;
    int32_t position = readPosition();
    int32_t halfRange = max(1L, config.value[CPR] * (int32_t)config.value[ANGLE] / 720);
    reportInputs(position, halfRange);
    int32_t force = calculateForce(clamp32(position, -halfRange * 2, halfRange * 2), halfRange, millis(), max((uint32_t)1, dt));
    writeMotor(force);
  }
  serviceSerial(); serviceSave();
}
