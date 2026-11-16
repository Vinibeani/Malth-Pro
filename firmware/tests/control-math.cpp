#include "Config.h"
#include "DynamicHID/PIDReportHandler.h"
#include "DynamicHID/HidControlChannel.h"
unsigned long millis() { return 100; }
// Executado como instrucoes AVR no emulador. Nao simula USB, ADC ou motor.
volatile uint8_t testResult[3];
static uint8_t cases = 0, failures = 0;
static void check(bool passed) { ++cases; if (!passed) ++failures; }
int main() {
  using namespace Malth;
  Config c; defaultConfig(c);
  check(REGISTER_COUNT == 65 && validConfig(c));
  c.value[ANGLE] = 30; check(validConfig(c));
  c.value[ANGLE] = 1080; check(validConfig(c));
  c.value[ANGLE] = 29; check(!validConfig(c)); c.value[ANGLE] = 540;
  c.value[PWM_HZ] = 4000; check(validConfig(c));
  c.value[PWM_HZ] = 20000; check(validConfig(c));
  c.value[PWM_HZ] = 32000; check(!validConfig(c)); c.value[PWM_HZ] = 16000;
  c.value[USE_INDEX] = 1; check(!validConfig(c)); c.value[USE_INDEX] = 0;
  c.value[DRIVE_MODE] = 3; check(!validConfig(c)); c.value[DRIVE_MODE] = 2;
  c.value[BRAKE_50] = 1; check(!validConfig(c)); defaultConfig(c);
  c.value[Y_LOW] = 900; check(!validConfig(c)); defaultConfig(c);
  check(pedalValue(199, 200, 600) == 0);
  check(pedalValue(200, 200, 600) == 0);
  check(pedalValue(400, 200, 600) == 511);
  check(pedalValue(600, 200, 600) == 1023);
  check(pedalValue(900, 200, 600) == 1023);
  check(pedalValue(400, 600, 200) == 511);
  check(pedalValue(600, 600, 200) == 0);
  check(pedalValue(200, 600, 200) == 1023);
  check(pedalValue(100, 600, 200) == 1023);
  check(pedalValue(900, 600, 200) == 0);
  bool linear = true;
  for (uint16_t raw = 0; raw <= 1023; ++raw) {
    int difference = (int)brakeValue(raw, &c.value[BRAKE_10]) - raw;
    if (difference < -1 || difference > 1) linear = false;
  }
  check(linear);
  int16_t nonlinear[] = {10,41,92,164,256,368,501,655,829,1023};
  check(brakeValue(512, nonlinear) >= 256 && brakeValue(512, nonlinear) <= 257);
  check(brakeValue(1023, nonlinear) == 1023);
  check(hGear(128, 256, &c.value[GEAR_1_X]) == 1);
  check(hGear(896, 768, &c.value[GEAR_1_X]) == 8);
  check(hGear(512, 512, &c.value[GEAR_1_X]) == 0);
  check(hGear(100, 400, &c.value[GEAR_1_X]) == 0);
  check(hGear(100, 400, &c.value[GEAR_1_X], 256, 512, 768, 450, 768) == 1);
  check(hGear(350, 100, &c.value[GEAR_1_X], 400, 512, 768, 256, 768) == 0);
  check(lowPass(0, 1000, 0) == 1000 && lowPass(0, 1000, 100) < 1000);
  // Regressao: 900 graus = +/-450; 1080 = +/-540, sem antecipar 10%.
  const uint16_t angles[] = {900, 1080};
  const int8_t sides[] = {-1, 1};
  for (uint16_t angle : angles) {
    int32_t edge = steeringHalfRange(1600, angle);
    check(edge == (angle == 900 ? 2000 : 2400));
    for (int8_t side : sides) {
      const int32_t positions[] = {edge * 8 / 9, edge * 9 / 10, edge - 1, edge};
      for (int32_t pos : positions) {
        check(applySteeringStops(0, pos * side, edge, 1600, 100, 100) == 0);
        check(applySteeringStops(1234, pos * side, edge, 1600, 100, 100) == 1234);
      }
      int32_t near = applySteeringStops(0, (edge + 1) * side, edge, 1600, 50, 50);
      int32_t far = applySteeringStops(0, (edge + edge / 10) * side, edge, 1600, 50, 50);
      check(near * side < 0 && far * side <= near * side);
      check(applySteeringStops(10000 * side, (edge + 1) * side, edge, 1600, 50, 50) == near);
      check(applySteeringStops(-10000 * side, (edge + 1) * side, edge, 1600, 50, 50) == -10000 * side);
      check(applySteeringStops(700, (edge + 10) * side, edge, 1600, 0, 0) == 700);
      check(applySteeringStops(0, (edge + 1) * side, edge, 1600, 0, 50) * side < 0);
      check(applySteeringStops(0, (edge + 1) * side, edge, 1600, 50, 0) * side < 0);
    }
  }
  check(steeringHalfRange(4000, 30) == 167);
  check(steeringHalfRange(4, 30) == 1);
  int32_t largeEdge = steeringHalfRange(32000, 1080);
  check(applySteeringStops(0, largeEdge * 2, largeEdge, 32000, 100, 100) == -10000);
  check(applySteeringStops(0, -largeEdge * 2, largeEdge, 32000, 100, 100) == 10000);
  HidControlChannel channel;
  uint8_t packet[64] = {0x40, 8, 'H','E','L','L','O',' ','2','\n'};
  char line[80];
  check(channel.accept(packet, 64));
  check(!channel.accept(packet, 64)); // nunca sobrescrever comando ainda nao consumido
  check(channel.read(line) && !strcmp(line, "HELLO 2"));
  check(!channel.read(line));
  packet[1] = 63; check(!channel.accept(packet, 64));
  packet[1] = 8; packet[0] = 1; check(!channel.accept(packet, 64));
  packet[0] = 0x40; check(!channel.accept(packet, 63));
  packet[9] = 0; check(!channel.accept(packet, 64)); packet[9] = '\n';
  char response[131]; memset(response, 'a', 130); response[130] = 0;
  check(channel.publish(response, 130)); check(!channel.publish("bad", 3));
  channel.report(packet); check(packet[0] == 0x40 && packet[1] == 62 && channel.pending());
  channel.report(packet); check(packet[1] == 62 && channel.pending());
  channel.report(packet); check(packet[1] == 6 && !channel.pending());
  channel.report(packet); check(packet[1] == 0);
  check(channel.publish("OK\n", 3)); channel.clear(); check(!channel.pending());
  uint16_t oldCrc = configCrc(c); c.value[CPR]++;
  check(configCrc(c) != oldCrc);
  PIDReportHandler pid;
  USB_FFBReport_CreateNewEffect_Feature_Data_t create = {5, USB_EFFECT_CONSTANT, 0};
  for (uint8_t id = 1; id <= MAX_EFFECTS; ++id) {
    pid.CreateNewEffect(&create); check(pid.pidBlockLoad.effectBlockIndex == id);
  }
  pid.CreateNewEffect(&create); check(pid.pidBlockLoad.loadStatus == 2);
  pid.FreeEffect(2); pid.CreateNewEffect(&create); check(pid.pidBlockLoad.effectBlockIndex == 2);
  uint16_t pool = pid.pidBlockLoad.ramPoolAvailable;
  pid.StopAllEffects(); check(pool == pid.pidBlockLoad.ramPoolAvailable);
  uint8_t invalid[] = {5, 255, 0xff, 0x7f};
  pid.UppackUsbData(invalid, sizeof(invalid)); check(pool == pid.pidBlockLoad.ramPoolAvailable);
  uint8_t constant[] = {5, 1, 0x10, 0x27};
  pid.UppackUsbData(constant, 1); check(pid.g_EffectStates[1].magnitude == 0);
  pid.UppackUsbData(constant, sizeof(constant)); check(pid.g_EffectStates[1].magnitude == 10000);
  USB_FFBReport_SetCondition_Output_Data_t condition = {};
  condition.reportId = 3; condition.effectBlockIndex = 1; condition.parameterBlockOffset = 255;
  pid.UppackUsbData((uint8_t*)&condition, sizeof(condition)); check(pid.g_EffectStates[1].conditionBlocksCount == 0);
  condition.parameterBlockOffset = 0;
  pid.UppackUsbData((uint8_t*)&condition, sizeof(condition));
  pid.UppackUsbData((uint8_t*)&condition, sizeof(condition)); check(pid.g_EffectStates[1].conditionBlocksCount == 1);
  USB_FFBReport_EffectOperation_Output_Data_t operation = {10, 1, 1, 3};
  pid.g_EffectStates[1].duration = 1000;
  pid.UppackUsbData((uint8_t*)&operation, sizeof(operation));
  pid.UppackUsbData((uint8_t*)&operation, sizeof(operation));
  check(pid.g_EffectStates[1].duration == 1000 && pid.g_EffectStates[1].loopCount == 3);
  create.effectType = USB_EFFECT_CUSTOM; pid.CreateNewEffect(&create); check(pid.pidBlockLoad.loadStatus == 3);
  uint8_t disable[] = {12, 2}; pid.UppackUsbData(disable, 2); check(!(pid.pidState.status & 2));
  uint8_t enable[] = {12, 1}; pid.UppackUsbData(enable, 2); check(pid.pidState.status & 2);
  // Sequencia PID de forca constante: valor assinado no unico eixo X,
  // incluindo Direction Enable e angulo zero (antes seno(0) anulava a forca).
  pid.FreeAllEffects(); create.effectType = USB_EFFECT_CONSTANT; pid.CreateNewEffect(&create);
  uint8_t effect[] = {1,1,1,0xff,0xff,0,0,0,0,255,0,4,0,0,0,0,0,0};
  pid.UppackUsbData(effect,sizeof(effect));
  uint8_t start[] = {10,1,1,1}; pid.UppackUsbData(start,sizeof(start));
  const int16_t magnitudes[] = {-10000,-1200,0,1200,10000};
  for (int16_t magnitude : magnitudes) {
    constant[2] = magnitude; constant[3] = (uint16_t)magnitude >> 8;
    pid.UppackUsbData(constant,sizeof(constant));
    check(pid.g_EffectStates[1].state == MEFFECTSTATE_PLAYING);
    check(steeringEffectValue(pid.g_EffectStates[1].magnitude,pid.g_EffectStates[1].enableAxis) == magnitude);
  }
  check(steeringEffectValue(1200,1) == 1200);
  check(steeringEffectValue(1200,2) == 0);
  check(steeringEffectValue(1200,0) == 0);
  check(steeringEffectValue(-1200,5) == -1200);
  check(stepSequentialGear(0,2)==8); check(stepSequentialGear(8,2)==8);
  check(stepSequentialGear(8,1)==0); check(stepSequentialGear(0,1)==1);
  check(stepSequentialGear(1,2)==0); check(stepSequentialGear(7,1)==7);
  check(stepSequentialGear(3,0)==3);
  testResult[1] = cases; testResult[2] = failures; testResult[0] = 0xa5;
  for (;;) {}
}
