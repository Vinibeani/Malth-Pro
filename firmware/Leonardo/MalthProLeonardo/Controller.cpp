#include "Controller.h"
#include "Config.h"
#include <Joystick.h>
#include <EEPROM.h>
#include <avr/eeprom.h>
#include <avr/interrupt.h>
#include <avr/wdt.h>
#include <util/atomic.h>
#include "EffectMath.h"
#include <stdio.h>
#include <stdlib.h>

using namespace Malth;

// D8 = R_EN + L_EN; D9 = LPWM; D10 = RPWM. Nao usar analogWrite nestes pinos.
static const uint8_t ENABLE_PIN = 8, LEFT_PWM = 9, RIGHT_PWM = 10;
static const uint8_t analogPins[] = {A0, A1, A2, A3, A4, A5};
static const uint8_t matrixColumns[] = {12, 7, 6, 5};
static const uint8_t matrixRows[] = {4, 14, 15, 16};
// Limite da primeira imagem de bancada. Aumentar somente depois de validar o sentido do motor.
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
// FFB autonomo (0.2.0): o motor nao depende do aplicativo. A posicao ao ligar
// e o centro; o jogo controla os atuadores pelo USB PID (Enable/Disable/Reset).
// O aplicativo so configura. DISARM e um corte manual que dura ate o proximo ARM.
static volatile bool centered = true, inhibited = false, transaction = false, hostSession = false;
static uint8_t nextRegister = 0;
static uint16_t overruns = 0;
static uint32_t lastControl = 0, lastTelemetry = 0, lastHostPing = 0;
static uint32_t matrixButtons = 0;
static uint8_t debounce[16] = {}, matrixRow = 0;
static volatile uint8_t motorMode = 0xff, motorPositive = 0, motorSettling = 0;
static uint32_t motorStageTime = 0;
static volatile int32_t diagnosticForce = 0, diagnosticPosition = 0, diagnosticRange = 0;

static void diagnostic16(uint8_t* p, uint16_t value) { p[0] = value; p[1] = value >> 8; }
static void diagnostic32(uint8_t* p, uint32_t value) {
  for (uint8_t i = 0; i < 4; ++i) p[i] = value >> (8 * i);
}
static void fillDiagnostic(uint8_t* p) {
  p[1] = 1; p[2] = !inhibited; p[3] = centered; p[4] = loopMissed;
  p[5] = DynamicHID().pidReportHandler.pidState.status;
  p[6] = DynamicHID().pidReportHandler.devicePaused;
  p[7] = config.value[DRIVE_MODE]; p[8] = config.value[MIN_FORCE]; p[9] = config.value[MAX_FORCE];
  p[10] = config.value[DESKTOP_EFFECT]; p[11] = config.value[DESKTOP_FORCE];
  diagnostic32(p + 12, diagnosticForce); diagnostic32(p + 16, diagnosticPosition);
  diagnostic32(p + 20, diagnosticRange);
  diagnostic16(p + 24, OCR1A); diagnostic16(p + 26, OCR1B); diagnostic16(p + 28, ICR1);
  p[30] = TCCR1A; p[31] = TCCR1B; p[32] = PORTB; p[33] = DDRB;
  diagnostic32(p + 34, millis()); diagnostic16(p + 38, overruns);
  diagnostic16(p + 40, config.value[PWM_HZ]); diagnostic16(p + 42, config.value[CPR]);
  p[44] = motorSettling; p[45] = motorMode;
  auto& pid = DynamicHID().pidReportHandler;
  p[46] = pid.deviceGain.gain; p[48] = pid.lastReport;
  diagnostic16(p + 50, pid.receivedReports); diagnostic16(p + 52, pid.rejectedReports);
  diagnostic16(p + 54, pid.createdEffects);
  p[62] = pid.lastDeviceControl; p[63] = pid.lastFreedEffect;
  for (uint8_t id = 1; id <= MAX_EFFECTS; ++id) {
    auto& e = pid.g_EffectStates[id];
    if (e.state) ++p[49];
    if (e.state == MEFFECTSTATE_PLAYING) {
      ++p[47];
      if (!p[59]) { p[56] = e.enableAxis; p[57] = e.directionX; p[58] = e.effectType;
        p[59] = id; diagnostic16(p + 60, e.magnitude); }
    }
  }
}

// Comunicacao limitada: nenhuma linha JSON do perfil inteiro e alocada no AVR.
static char inputLine[80], tx[176], reply[128];

static const uint16_t RECORD_BYTES = sizeof(Config) + 6;
static uint16_t generation = 0, saveIndex = 0;
static uint8_t savedSlot = 1, saveSlot = 0;
static volatile bool saving = false;

static void motorOff() {
  TIMSK1 &= ~_BV(TOIE1);
  PORTB &= ~_BV(4); // D8 baixo antes de qualquer mudanca no PWM.
  PORTB &= ~(_BV(5) | _BV(6)); // Precarregar LOW antes de devolver os pinos ao GPIO.
  TCCR1A = _BV(WGM11);
  OCR1A = OCR1B = 0;
  motorMode = 0xff; motorSettling = 0;
}

// Unica regra de liberacao do motor, usada no laco, na ISR de comutacao e no
// assentamento. Nao depende de PING/sessao do aplicativo.
static bool motorAllowed() {
  auto& pid = DynamicHID().pidReportHandler;
  return !inhibited && centered && !transaction && !saving && USBDevice.configured() &&
         !pid.devicePaused && (pid.pidState.status & 2) && loopMissed < 20;
}

// Three overflow boundaries guarantee at least two complete PWM periods
// after changing COM/OCR, even when the main loop is busy calculating FFB.
// Interrupts are enabled only during commutation, not on every PWM cycle.
static void motorPwmOverflow() {
  if (!motorSettling) { TIMSK1 &= ~_BV(TOIE1); return; }
  if (!motorAllowed()) { motorOff(); return; }
  if (--motorSettling == 0) { PORTB |= _BV(4); TIMSK1 &= ~_BV(TOIE1); }
}
ISR(TIMER1_OVF_vect) { motorPwmOverflow(); }

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
  diagnosticForce = force;
  if (!motorAllowed()) { motorOff(); return; }
  force = clamp32(force, -10000, 10000);
  if (force == 0) { motorOff(); return; }
  uint16_t magnitude = motorMagnitude(force < 0 ? -force : force,
                                      config.value[MIN_FORCE], config.value[MAX_FORCE]);
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
    if (!motorAllowed()) motorOff();
    else if (motorMode != mode || motorPositive != positive) {
      motorOff();
      PORTB = (PORTB & ~(_BV(4) | _BV(5) | _BV(6))) | (output.digital & _BV(6));
      OCR1A = output.a; OCR1B = output.b;
      TCCR1A = compare;
      motorMode = mode; motorPositive = positive;
      motorStageTime = micros(); motorSettling = 3;
      TIFR1 = _BV(TOV1); TIMSK1 |= _BV(TOIE1);
    } else if (!motorSettling || (uint32_t)(now - motorStageTime) >= settleMicros) {
      // Durante o assentamento os OCR ficam congelados. Depois, so muda
      // a magnitude: nao desconectar o PWM nem limpar DIR a cada controle.
      OCR1A = output.a; OCR1B = output.b;
      PORTB |= _BV(4);
      motorSettling = 0; TIMSK1 &= ~_BV(TOIE1);
    }
  }
}

// Finish the PWM-buffer settling independently of the2ms force-update clock.
// Otherwise an alternating effect can restart settling on every update and
// keep D8 disabled for the entire waveform. No busy wait or extra ISR.
static void serviceMotorEnable() {
  if (!motorSettling || (uint32_t)(micros() - motorStageTime) < motorSettleMicros(config.value[PWM_HZ])) return;
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    if (!motorAllowed()) motorOff();
    else if (motorSettling) { PORTB |= _BV(4); motorSettling = 0; TIMSK1 &= ~_BV(TOIE1); }
  }
}

static int32_t calculateForce(int32_t position, int32_t halfRange, uint32_t now, uint32_t dt) {
  auto& pid = DynamicHID().pidReportHandler;
  int32_t delta = position - previousPosition;
  int32_t speed = motionRate(delta, dt, 1000000);
  velocity = lowPass(velocity, speed, config.value[DAMPER_FILTER]);
  acceleration = lowPass(acceleration, motionRate(velocity - previousVelocity,
                         dt, 10000000), config.value[INERTIA_FILTER]);
  friction = lowPass(friction, delta > 0 ? 10000 : delta < 0 ? -10000 : 0, config.value[FRICTION_FILTER]);
  previousPosition = position; previousVelocity = velocity;
  int32_t total = 0;
  bool gameEffect = false;
  uint32_t lastOutput;
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { lastOutput = pid.lastOutputMillis; }
  uint32_t silence = now - lastOutput;
  for (uint8_t id = 1; id <= MAX_EFFECTS; ++id) {
    TEffectState e;
    ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { memcpy(&e, (const void*)&pid.g_EffectStates[id], sizeof(e)); }
    if (e.state != MEFFECTSTATE_PLAYING) continue;
    uint32_t elapsed;
    if (!effectElapsed(e, now, elapsed)) continue;
    gameEffect = true;
    int32_t metric = 0;
    uint16_t gain = 100;
    if (e.effectType == USB_EFFECT_SPRING) {
      metric = clamp32(position, -halfRange, halfRange) * 10000L / halfRange;
      gain = (int32_t)config.value[SPRING_GAIN] * (50 + config.value[SPRING_SCALE]) / 100;
    } else if (e.effectType == USB_EFFECT_DAMPER) {
      metric = clamp32(velocity, -config.value[CPR] * 2L, config.value[CPR] * 2L) * 5000L / config.value[CPR];
      gain = config.value[DAMPER_GAIN];
    } else if (e.effectType == USB_EFFECT_INERTIA) {
      metric = clamp32(acceleration, -config.value[CPR] * 10L, config.value[CPR] * 10L) * 1000L / config.value[CPR];
      gain = config.value[INERTIA_GAIN];
    } else if (e.effectType == USB_EFFECT_FRICTION) {
      metric = friction; gain = config.value[FRICTION_GAIN];
    } else if (e.effectType == USB_EFFECT_CONSTANT) {
      gain = (int32_t)config.value[CONSTANT_GAIN] * (50 + config.value[CONSTANT_SCALE]) / 100;
    } else if (e.effectType == USB_EFFECT_SINE) {
      gain = (int32_t)config.value[SINE_GAIN] * (50 + config.value[SINE_SCALE]) / 100;
    }
    int32_t value = gameMotorForce(e, effectValue(e, elapsed, metric));
    if (!passiveEffect(e.effectType)) value = staleEffectScale(value, silence);
    total += value * (int32_t)e.gain / 255 * gain / 100;
  }
  total = total * pid.deviceGain.gain / 255;
  if (!gameEffect) {
    if (config.value[DESKTOP_EFFECT] == 1) total -= clamp32(position, -halfRange, halfRange) * config.value[DESKTOP_FORCE] * 100L / halfRange;
    if (config.value[DESKTOP_EFFECT] == 2) total -= clamp32(velocity, -config.value[CPR] * 2L, config.value[CPR] * 2L) * config.value[DESKTOP_FORCE] / config.value[CPR];
    if (config.value[DESKTOP_EFFECT] == 3) total -= friction * config.value[DESKTOP_FORCE] / 100;
  }
  total = applySteeringStops(total, position, halfRange, config.value[CPR],
                            config.value[HARDLOCK], config.value[SOFTLOCK]);
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
      gear = stepSequentialGear(gear, direction);
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
static void inhibit() { inhibited = true; motorOff(); }
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
    // Conectar o aplicativo nao interrompe o FFB de um jogo em andamento.
    hostSession = true; lastHostPing = millis();
    queueReply(F("{\"type\":\"hello\",\"device\":\"MalthPro\",\"protocol\":2,\"firmware\":\"0.2.0\",\"registers\":65,\"btsPwmDir\":1,\"ffbAuto\":1}\n")); return;
  }
  if (!hostSession) { queueReply(F("{\"type\":\"error\",\"code\":\"HELLO_REQUIRED\"}\n")); return; }
  lastHostPing = millis();
  if (!strcmp(op, "PING")) { lastHostPing = millis(); ack(op); return; }
  if (!strcmp(op, "DISARM")) { inhibit(); ack(op); return; }
  if (saving) { queueReply(F("{\"type\":\"error\",\"code\":\"SAVING\"}\n")); return; }
  // A transacao e a gravacao desligam o motor por motorAllowed(); ele volta sozinho ao terminar.
  if (!strcmp(op, "BEGIN")) { motorOff(); staging = config; nextRegister = 0; transaction = true; ack(op); return; }
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
    // 0.2.0: o aplicativo so recentraliza se o firmware perdeu o centro (CPR/INVERT).
    snprintf_P(reply, sizeof(reply), PSTR("{\"type\":\"ack\",\"cmd\":\"COMMIT\",\"centered\":%u}\n"), centered);
    return;
  }
  if (!strcmp(op, "SAVE") && !transaction) {
    motorOff(); staging = config; ++generation; saveSlot = savedSlot ^ 1; saveIndex = 0; saving = true; return;
  }
  if (!strcmp(op, "CENTER") && !transaction) {
    motorOff(); ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { encoderCenter = encoderCount; }
    previousPosition = previousVelocity = velocity = acceleration = friction = 0;
    centered = true; ack(op); return;
  }
  if (!strcmp(op, "ARM") && !transaction && centered) {
    lastHostPing = millis(); loopMissed = 0; inhibited = false;
    DynamicHID().pidReportHandler.pidState.status |= 2;
    ack(op); return;
  }
  queueReply(F("{\"type\":\"error\",\"code\":\"COMMAND_OR_CENTER_REQUIRED\"}\n"));
}

static void serviceHost() {
  auto& channel = DynamicHID().controlChannel;
  if (!USBDevice.configured()) {
    hostSession = false; transaction = false; reply[0] = 0;
    ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { channel.clear(); }
    return;
  }
  // Drop an abandoned configuration, keeping the last committed profile.
  if (transaction && millis() - lastHostPing > 2000) transaction = false;
  bool received = false;
  if (!reply[0] && !saving) {
    ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { received = channel.read(inputLine); }
  }
  if (received) command(inputLine);
  // Publicar so depois de construir a mensagem; GET_FEATURE nunca le buffer parcial.
  if (!channel.pending()) {
    uint8_t length = 0;
    if (reply[0]) { strncpy(tx, reply, sizeof(tx)); length = strlen(tx); reply[0] = 0; }
    else if (hostSession && millis() - lastTelemetry >= 32) {
      lastTelemetry = millis();
      length = snprintf_P(tx, sizeof(tx), PSTR("{\"type\":\"state\",\"raw\":[%u,%u,%u,%u,%u,%u],\"steering\":%d,\"gear\":%u,\"armed\":%u,\"centered\":%u,\"overruns\":%u,\"buttons\":%u}\n"),
        raw[0], raw[1], raw[2], raw[3], raw[4], raw[5], normalizedSteering, gear, !inhibited, centered, overruns, (uint16_t)matrixButtons);
    }
    if (length) { ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { channel.publish(tx, length); } }
  }
}

void malthBegin() {
  wdt_disable();
  DynamicHID().diagnosticReport = fillDiagnostic;
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
  // Atuadores habilitados desde o inicio: o jogo pode desabilitar/reabilitar
  // pelo Device Control. Seguranca: Safety Switch + Actuator Power (0x14) | 0x02.
  DynamicHID().pidReportHandler.pidState.status = 0x16;
  Serial.begin(115200);
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    TCCR3A = TCCR3B = 0; TCNT3 = 0;
    OCR3A = F_CPU / 8 / 1000 - 1;
    TCCR3B = _BV(WGM32) | _BV(CS31); TIMSK3 = _BV(OCIE3A);
  }
  lastControl = micros(); wdt_enable(WDTO_250MS);
}

void malthLoop() {
  // O toque a 1200 baud usa o watchdog do core para entrar no Caterina.
  // Nao alimentar esse watchdog enquanto o reset de upload esta pendente.
  if (Serial.baud() == 1200 && !Serial.dtr()) { motorOff(); return; }
  wdt_reset();
  static bool usbWasConfigured = false;
  bool usbConfigured = USBDevice.configured();
  if (usbWasConfigured && !usbConfigured) {
    // Host perdido (suspensao/reenumeracao): o motor ja para por motorAllowed().
    // Limpar efeitos para que nada antigo volte a tocar quando o host retornar.
    // O centro do encoder continua valido: a placa nao reiniciou.
    motorOff();
    auto& pid = DynamicHID().pidReportHandler;
    ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
      pid.FreeAllEffects(); pid.devicePaused = 0; pid.deviceGain.gain = 255; pid.pidState.status = 0x16;
    }
  }
  usbWasConfigured = usbConfigured;
  uint32_t now = micros(), dt = now - lastControl;
  if (dt >= CONTROL_US) {
    lastControl = now;
    if (dt > 5000 && overruns < 65535) ++overruns;
    if (loopMissed >= 20) motorOff();
    loopMissed = 0;
    int32_t position = readPosition();
    int32_t halfRange = steeringHalfRange(config.value[CPR], config.value[ANGLE]);
    diagnosticPosition = position; diagnosticRange = halfRange;
    reportInputs(position, halfRange);
    int32_t force = calculateForce(clamp32(position, -halfRange * 2, halfRange * 2), halfRange, millis(), max((uint32_t)1, dt));
    writeMotor(force);
  }
  serviceHost(); serviceSave(); serviceMotorEnable();
}
