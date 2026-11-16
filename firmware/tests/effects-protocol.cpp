#include "Config.h"
#include "EffectMath.h"
#include "DynamicHID/PIDReportHandler.h"
static unsigned long clockMs=100;
unsigned long millis(){return clockMs;}
volatile uint8_t testResult[3];
static uint8_t cases=0,failures=0;
static void check(bool value){++cases;if(!value)++failures;}
int main(){
  using namespace Malth;
  PIDReportHandler pid;
  USB_FFBReport_CreateNewEffect_Feature_Data_t create={5,USB_EFFECT_CONSTANT,0};
  pid.CreateNewEffect(&create);
  uint8_t set[]={1,1,1,100,0,0,0,0,0,255,0,1,0,0,0,0,0,0,50,0};
  pid.UppackUsbData(set,sizeof(set));
  uint8_t start[]={10,1,1,2};pid.UppackUsbData(start,sizeof(start));
  TEffectState e;memcpy(&e,(const void*)&pid.g_EffectStates[1],sizeof(e));
  uint32_t elapsed=0;
  check(e.startDelay==50);
  check(!effectElapsed(e,149,elapsed));
  check(effectElapsed(e,150,elapsed)&&elapsed==0);
  check(effectElapsed(e,249,elapsed)&&elapsed==99);
  check(effectElapsed(e,250,elapsed)&&elapsed==0);
  check(!effectElapsed(e,350,elapsed));
  e.loopCount=255;check(effectElapsed(e,100000,elapsed));
  e.startTime=0xfffffff0UL;e.startDelay=0;e.duration=100;
  check(effectElapsed(e,10,elapsed)&&elapsed==26);
  e.duration=USB_DURATION_INFINITE;check(effectElapsed(e,100000,elapsed));
  clockMs=200;uint8_t pause[]={12,5};pid.UppackUsbData(pause,2);
  clockMs=1200;uint8_t resume[]={12,6};pid.UppackUsbData(resume,2);
  memcpy(&e,(const void*)&pid.g_EffectStates[1],sizeof(e));
  check(effectElapsed(e,1200,elapsed)&&elapsed==50);
  check(!pid.devicePaused&&!(pid.pidState.status&1));
  pid.UppackUsbData(pause,2);uint8_t reset[]={12,4};pid.UppackUsbData(reset,2);
  // USB PID5.13: Reset clears pause/effects and ENABLES actuators. ETS2 can
  // reset the device after the application's ARM, then recreate its effect.
  check(!pid.devicePaused&&!(pid.pidState.status&1)&&(pid.pidState.status&2)&&pid.deviceGain.gain==255);
  bool empty=true;for(uint8_t id=1;id<=MAX_EFFECTS;++id)if(pid.g_EffectStates[id].state)empty=false;
  check(empty);
  uint8_t disable[]={12,2};pid.UppackUsbData(disable,2);
  check(!(pid.pidState.status&2));
  pid.UppackUsbData(reset,2);check(pid.pidState.status&2);
  pid.CreateNewEffect(&create);
  uint8_t etsSet[]={1,1,1,255,127,0,0,0,0,255,0,4,63,0,0,0,0,0,0,0};
  uint8_t etsForce[]={5,1,82,3}; // +850, observed in live ETS2 diagnostics.
  uint8_t etsStart[]={10,1,1,1};
  pid.UppackUsbData(etsSet,sizeof(etsSet));pid.UppackUsbData(etsForce,sizeof(etsForce));
  pid.UppackUsbData(etsStart,sizeof(etsStart));
  memcpy(&e,(const void*)&pid.g_EffectStates[1],sizeof(e));
  check(effectElapsed(e,clockMs,elapsed)&&effectValue(e,elapsed,0)==850&&(pid.pidState.status&2));
  pid.UppackUsbData(disable,2);check(!(pid.pidState.status&2));
  memset(&e,0,sizeof(e));e.enableAxis=1;e.effectType=USB_EFFECT_CONSTANT;e.duration=1000;
  e.magnitude=-5000;e.attackTime=200;e.attackLevel=1000;e.fadeTime=200;e.fadeLevel=500;
  check(effectValue(e,0,0)==-1000);check(effectValue(e,100,0)==-3000);
  check(effectValue(e,500,0)==-5000);check(effectValue(e,900,0)==-2750);
  e.effectType=USB_EFFECT_RAMP;e.startMagnitude=-4000;e.endMagnitude=4000;e.attackLevel=0;e.fadeTime=0;
  check(effectValue(e,0,0)==0);check(effectValue(e,100,0)==-1600);check(effectValue(e,500,0)==0);
  e.duration=USB_DURATION_INFINITE;check(effectValue(e,100000,0)==-4000);
  e.duration=2000;e.effectType=USB_EFFECT_SQUARE;e.magnitude=4000;e.offset=1000;
  e.period=1000;e.attackTime=200;e.attackLevel=0;
  check(effectValue(e,100,0)==3000);check(effectValue(e,600,0)==-3000);
  e.attackTime=0;e.effectType=USB_EFFECT_SINE;
  check(effectValue(e,0,0)==1000);check(effectValue(e,250,0)==5000);
  check(effectValue(e,500,0)==1000);check(effectValue(e,750,0)==-3000);
  e.phase=9000;check(effectValue(e,0,0)==5000);e.phase=0;
  e.effectType=USB_EFFECT_TRIANGLE;
  check(effectValue(e,0,0)==-3000);check(effectValue(e,250,0)==1000);check(effectValue(e,500,0)==5000);
  e.effectType=USB_EFFECT_SAWTOOTHUP;check(effectValue(e,0,0)==-3000);check(effectValue(e,500,0)==1000);
  e.effectType=USB_EFFECT_SAWTOOTHDOWN;check(effectValue(e,0,0)==5000);check(effectValue(e,500,0)==1000);
  e.conditions[0]={1000,10000,5000,2000,1000,500};
  for(uint8_t type=USB_EFFECT_SPRING;type<=USB_EFFECT_FRICTION;++type){
    e.effectType=type;check(effectValue(e,0,1000)==0);check(effectValue(e,0,2000)==-500);
    check(effectValue(e,0,0)==250);check(effectValue(e,0,10000)==-2000);check(effectValue(e,0,-10000)==1000);
  }
  check(motionRate(1000000000L,2000,1000000)==1000000);
  check(motionRate(-1000000000L,2000,1000000)==-1000000);
  check(motionRate(4,2000,1000000)==2000);
  int16_t curve[]={10,41,92,164,256,368,501,655,829,1023};
  bool monotone=true;uint16_t previous=0;
  for(uint16_t raw=0;raw<=1023;++raw){uint16_t value=brakeValue(pedalValue(raw,300,800),curve);if(value<previous||value>1023)monotone=false;previous=value;}
  check(monotone);check(brakeValue(pedalValue(300,300,800),curve)==0);check(brakeValue(pedalValue(800,300,800),curve)==1023);
  monotone=true;previous=0;
  for(int16_t raw=1023;raw>=0;--raw){uint16_t value=brakeValue(pedalValue(raw,800,300),curve);if(value<previous||value>1023)monotone=false;previous=value;}
  check(monotone);check(brakeValue(pedalValue(800,800,300),curve)==0);check(brakeValue(pedalValue(300,800,300),curve)==1023);
  // Incoming +X force must oppose positive encoder travel, not reinforce it.
  memset(&e,0,sizeof(e));e.effectType=USB_EFFECT_CONSTANT;e.enableAxis=4;e.directionX=63;
  check(gameMotorForce(e,5000)<-4990);check(gameMotorForce(e,-5000)>4990);
  e.directionX=191;check(gameMotorForce(e,5000)>4990);
  e.directionX=0;check(gameMotorForce(e,5000)==0);
  e.enableAxis=1;check(gameMotorForce(e,850)==-850);
  e.effectType=USB_EFFECT_SPRING;check(gameMotorForce(e,-850)==-850);
  e.effectType=USB_EFFECT_DAMPER;check(gameMotorForce(e,850)==850);
  for(uint8_t type=USB_EFFECT_RAMP;type<=USB_EFFECT_SAWTOOTHDOWN;++type){e.effectType=type;check(gameMotorForce(e,850)==-850);}
  // A local end stop must keep its existing restoring polarity.
  check(applySteeringStops(0,2100,2000,1600,50,50)<0);
  check(applySteeringStops(0,-2100,2000,1600,50,50)>0);
  // 0.2.0: efeitos ativos expiram sem relatorios PID; condicoes permanecem.
  clockMs=5000;uint8_t ping[]={12,3};pid.UppackUsbData(ping,2);check(pid.lastOutputMillis==5000);
  check(staleEffectScale(4000,0)==4000);check(staleEffectScale(-4000,1500)==-4000);
  check(staleEffectScale(4000,1750)==2000);check(staleEffectScale(-4000,1750)==-2000);
  check(staleEffectScale(4000,2000)==0);check(staleEffectScale(4000,600000UL)==0);
  check(staleEffectScale(10000,1501)>9970&&staleEffectScale(10000,1999)<30);
  for(uint8_t type=USB_EFFECT_CONSTANT;type<=USB_EFFECT_SAWTOOTHUP;++type)check(!passiveEffect(type));
  for(uint8_t type=USB_EFFECT_SPRING;type<=USB_EFFECT_FRICTION;++type)check(passiveEffect(type));
  uint32_t lastValidOutput = pid.lastOutputMillis;
  clockMs += 500;
  uint8_t malformed[] = {5, 0, 0, 0};
  pid.UppackUsbData(malformed, sizeof(malformed));
  check(pid.lastOutputMillis == lastValidOutput);
  uint8_t enableActuators[] = {12, 1};
  pid.UppackUsbData(enableActuators, sizeof(enableActuators));
  check(pid.lastOutputMillis == clockMs);
  testResult[1]=cases;testResult[2]=failures;testResult[0]=0xa5;for(;;){}
}
