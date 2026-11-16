// Sessao completa do Controller.cpp REAL em instrucoes AVR (avr8js), sem aplicativo.
// O jogo e simulado pelos relatorios USB PID reais (sequencia observada no ETS2).
// Nao simula a eletronica da BTS7960 nem o USB fisico: verifica a logica de liberacao
// do motor (D8 = PORTB bit4) e a forca calculada (diagnosticForce).
#include <Arduino.h>
struct TestUSB { bool present = true; bool configured() { return present; } } testUSB;
struct TestSerial { void begin(unsigned long) {} uint32_t baud() { return 115200; } bool dtr() { return true; } } testSerial;
#define USBDevice testUSB
#define Serial testSerial
static unsigned long clockUs = 1000;
extern "C" {
unsigned long millis(void) { return clockUs / 1000; }
unsigned long micros(void) { return clockUs; }
void pinMode(uint8_t, uint8_t) {}
void digitalWrite(uint8_t, uint8_t) {}
int digitalRead(uint8_t) { return HIGH; }
int analogRead(uint8_t) { return 512; }
void attachInterrupt(uint8_t, void (*)(void), int) {}
}
#include "Controller.cpp"
FakeDynamicHID testHid;
FakeDynamicHID& DynamicHID() { return testHid; }

volatile uint8_t testResult[3];
static uint8_t cases = 0, failures = 0;
static void check(bool x) { ++cases; if (!x) ++failures; }
static void run(uint32_t ms) { for (uint32_t i = 0; i < ms * 2; ++i) { clockUs += 500; malthLoop(); } }
static bool motorOn() { return PORTB & _BV(4); }
static int32_t force() { return diagnosticForce; }
static void report(const uint8_t* d, uint8_t n) { uint8_t b[24]; memcpy(b, d, n); testHid.pidReportHandler.UppackUsbData(b, n); }
static void wheelAt(int32_t p) { ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { encoderCount = encoderCenter + p; } }
static bool host(const char* text) { char b[80]; strcpy(b, text); reply[0] = 0; command(b); return strstr(reply, "error") == nullptr; }

static const uint8_t RESET[] = {12, 4}, DISABLE[] = {12, 2}, ENABLE[] = {12, 1};
static const uint8_t ETS_SET[] = {1, 1, 1, 255, 127, 0, 0, 0, 0, 255, 0, 4, 63, 0, 0, 0, 0, 0, 0, 0};
static const uint8_t ETS_FORCE[] = {5, 1, 82, 3}; // +850, valor real lido no ETS2
static const uint8_t ETS_START[] = {10, 1, 1, 1};

int main() {
  malthBegin();
  // A: ligado, sem aplicativo e sem jogo. Volante no centro: nada acontece.
  run(20);
  check(centered && !inhibited && !hostSession); check(force() == 0 && !motorOn());

  // B: batente funciona sem aplicativo (meia faixa padrao = 3001 contagens).
  wheelAt(3500); run(10); check(force() < 0 && motorOn());
  wheelAt(-3500); run(10); check(force() > 0 && motorOn());
  wheelAt(0); run(10); check(force() == 0 && !motorOn());

  // C: jogo inicia o FFB sem aplicativo: Reset, cria constante, Set, forca, Start.
  report(RESET, 2);
  USB_FFBReport_CreateNewEffect_Feature_Data_t create = {5, USB_EFFECT_CONSTANT, 0};
  testHid.pidReportHandler.CreateNewEffect(&create);
  report(ETS_SET, sizeof(ETS_SET)); report(ETS_FORCE, sizeof(ETS_FORCE)); report(ETS_START, sizeof(ETS_START));
  run(10);
  int32_t gameForce = force();
  check(gameForce < -500 && gameForce > -700 && motorOn()); // 850 * ganho constante 70% ~ -594

  // D: o aplicativo abre no meio da corrida: HELLO nao interrompe e anuncia ffbAuto.
  check(host("HELLO 2") && strstr(reply, "\"ffbAuto\":1") && strstr(reply, "\"firmware\":\"0.2.0\""));
  run(5); check(motorOn() && force() == gameForce);

  // E: aplicativo fechado/travado (sem PING por 5 s); o jogo continua enviando: FFB continua.
  for (uint8_t i = 0; i < 50; ++i) { report(ETS_FORCE, sizeof(ETS_FORCE)); run(100); }
  check(motorOn() && force() == gameForce);

  // F: o jogo trava e para de enviar relatorios: efeito ativo some em 1,5..2,0 s.
  run(1400); check(motorOn() && force() == gameForce);
  run(350); check(force() < gameForce / 5 && force() > gameForce / 2); // ~30% no meio do esmaecimento
  run(300); check(force() == 0 && !motorOn());
  // ...mas o batente local continua protegendo o fim de curso.
  wheelAt(3500); run(10); check(force() < 0 && motorOn()); wheelAt(0);

  // G: o jogo volta a enviar: a forca volta.
  report(ETS_FORCE, sizeof(ETS_FORCE)); run(10); check(force() == gameForce && motorOn());

  // H: o jogo desabilita os atuadores (Device Control): tudo desliga, inclusive o batente.
  report(DISABLE, 2); wheelAt(3500); run(10); check(!motorOn());
  report(ENABLE, 2); run(10); check(motorOn() && force() < 0); wheelAt(0);

  // I: corte manual pelo aplicativo (DISARM) vale ate o proximo ARM.
  report(ETS_FORCE, sizeof(ETS_FORCE));
  check(host("DISARM")); run(10); check(!motorOn());
  check(host("ARM")); run(10); check(motorOn() && force() == gameForce);

  // J: transacao de configuracao desliga o motor; ela termina e o FFB volta sozinho.
  check(host("BEGIN")); run(10); check(!motorOn());
  check(!host("SET 9 1")); run(10); check(motorOn());

  // An app crash after BEGIN must not leave the motor blocked forever.
  check(host("BEGIN")); run(10); check(transaction && !motorOn());
  for (uint8_t i = 0; i < 22; ++i) { report(ETS_FORCE, sizeof(ETS_FORCE)); run(100); }
  check(!transaction && motorOn() && force() == gameForce);

  // K: perda do USB: motor desliga e efeitos sao liberados; centro preservado.
  check(host("BEGIN"));
  testUSB.present = false; run(10); check(!motorOn() && centered && !transaction);
  bool empty = true; for (uint8_t id = 1; id <= MAX_EFFECTS; ++id) if (testHid.pidReportHandler.g_EffectStates[id].state) empty = false;
  check(empty);
  testUSB.present = true; run(10); check(force() == 0 && !motorOn());
  wheelAt(3500); run(10); check(motorOn() && force() < 0);

  testResult[1] = cases; testResult[2] = failures; testResult[0] = 0xa5; for (;;) {}
}
