/*
  Force Feedback Joystick Math
  Joystick model specific code for calculating force feedback.
  Copyright 2016  Jaka Simonic
  Copyright 2019  hoantv
  Copyright 2022  Sulako
  Permission to use, copy, modify, distribute, and sell this
  software and its documentation for any purpose is hereby granted
  without fee, provided that the above copyright notice appear in
  all copies and that both that the copyright notice and this
  permission notice and warranty disclaimer appear in supporting
  documentation, and that the name of the author not be used in
  advertising or publicity pertaining to distribution of the
  software without specific, written prior permission.
  The author disclaim all warranties with regard to this
  software, including all implied warranties of merchantability
  and fitness.  In no event shall the author be liable for any
  special, indirect or consequential damages or any damages
  whatsoever resulting from loss of use, data or profits, whether
  in an action of contract, negligence or other tortious action,
  arising out of or in connection with the use or performance of
  this software.
*/


// Adaptacao Malth: envelopes/forca escalar comparados com AFFBWheel.
// Tempo, interpolacao inteira, formatos PID e sinais proprios deste firmware.
#pragma once
#include "ControlMath.h"
#include <DynamicHID/PIDReportType.h>
#include <avr/pgmspace.h>
namespace Malth {
static const int16_t sineQuarter[] PROGMEM = {0, 245, 491, 736, 980, 1224, 1467, 1710, 1951, 2191, 2430, 2667, 2903, 3137, 3369, 3599, 3827, 4052, 4276, 4496, 4714, 4929, 5141, 5350, 5556, 5758, 5957, 6152, 6344, 6532, 6716, 6895, 7071, 7242, 7410, 7572, 7730, 7883, 8032, 8176, 8315, 8449, 8577, 8701, 8819, 8932, 9040, 9142, 9239, 9330, 9415, 9495, 9569, 9638, 9700, 9757, 9808, 9853, 9892, 9925, 9952, 9973, 9988, 9997, 10000};
inline int16_t sineWave(uint16_t phase) {
  uint16_t position=phase & 0x3fff;
  uint8_t quadrant=phase >> 14;
  if (quadrant & 1) position=16384-position;
  uint8_t index=position >> 8;
  int32_t value=pgm_read_word(sineQuarter+index);
  if (index<64) value += ((int32_t)pgm_read_word(sineQuarter+index+1)-value)*(position&255)/256;
  return quadrant & 2 ? -value : value;
}
// DirectInput directions describe where a force comes FROM, whereas this
// motor's positive command moves the encoder in its positive direction.
// Conditions already calculate an applied/restoring force from the metric.
inline int32_t gameMotorForce(const TEffectState& e,int32_t value) {
  if (e.effectType>=USB_EFFECT_SPRING && e.effectType<=USB_EFFECT_FRICTION) return value;
  if (e.enableAxis & 4) {
    uint16_t phase=(uint32_t)e.directionX*65536UL/255;
    return -value*sineWave(phase)/10000;
  }
  return -value;
}
// FFB autonomo (0.2.0): o motor nao depende mais do aplicativo aberto. Se o
// jogo travar ou for encerrado sem limpar os efeitos, uma forca constante ou
// periodica continuaria empurrando o volante. Efeitos ativos desaparecem
// quando o host para de enviar relatorios PID; condicoes (mola, amortecimento,
// atrito, inercia) so reagem ao movimento do volante e permanecem.
static const uint16_t ACTIVE_EFFECT_HOLD_MS = 1500, ACTIVE_EFFECT_FADE_MS = 500;
inline bool passiveEffect(uint8_t type) {
  return type>=USB_EFFECT_SPRING && type<=USB_EFFECT_FRICTION;
}
inline int32_t staleEffectScale(int32_t value,uint32_t silenceMs) {
  if (silenceMs<=ACTIVE_EFFECT_HOLD_MS) return value;
  if (silenceMs>=(uint32_t)ACTIVE_EFFECT_HOLD_MS+ACTIVE_EFFECT_FADE_MS) return 0;
  return value*(int32_t)(ACTIVE_EFFECT_HOLD_MS+ACTIVE_EFFECT_FADE_MS-silenceMs)/ACTIVE_EFFECT_FADE_MS;
}
inline bool effectElapsed(const TEffectState& e,uint32_t now,uint32_t& elapsed) {
  if (e.state!=MEFFECTSTATE_PLAYING) return false;
  uint32_t age=now-e.startTime;
  if (age<e.startDelay) return false;
  age-=e.startDelay;
  bool infinite=e.duration==USB_DURATION_INFINITE || e.duration==0xffff;
  if (!infinite) {
    if (!e.duration) return false;
    uint8_t loops=e.loopCount ? e.loopCount : 1;
    if (loops!=0xff && age >= e.duration*(uint32_t)loops) return false;
    elapsed=age%e.duration;
  } else elapsed=age;
  return true;
}
inline int32_t envelopedMagnitude(int32_t value,const TEffectState& e,uint32_t elapsed) {
  if (!value) return 0;
  int32_t level=value<0 ? -value : value, envelope=level;
  bool attack=e.attackTime && elapsed<e.attackTime;
  if (attack) envelope=e.attackLevel+(level-e.attackLevel)*(int32_t)elapsed/e.attackTime;
  bool infinite=e.duration==USB_DURATION_INFINITE || e.duration==0xffff;
  if (!infinite && e.fadeTime && elapsed<=e.duration && e.duration-elapsed<e.fadeTime) {
    int32_t fade=e.fadeLevel+(level-e.fadeLevel)*(int32_t)(e.duration-elapsed)/e.fadeTime;
    if (!attack || fade<envelope) envelope=fade;
  }
  return value<0 ? -envelope : envelope;
}
inline int32_t conditionEffect(const TEffectCondition& c,int32_t metric) {
  int32_t delta=metric-c.cpOffset;
  if (delta>c.deadBand) return -clamp32((delta-c.deadBand)*(int32_t)c.positiveCoefficient/10000,
                                      -(int32_t)c.positiveSaturation,c.positiveSaturation);
  if (delta<-(int32_t)c.deadBand) return -clamp32((delta+c.deadBand)*(int32_t)c.negativeCoefficient/10000,
                                               -(int32_t)c.negativeSaturation,c.negativeSaturation);
  return 0;
}
inline int32_t effectValue(const TEffectState& e,uint32_t elapsed,int32_t metric) {
  int32_t value=0;
  if (e.effectType>=USB_EFFECT_SPRING && e.effectType<=USB_EFFECT_FRICTION)
    value=conditionEffect(e.conditions[0],metric);
  else if (e.effectType==USB_EFFECT_CONSTANT) value=envelopedMagnitude(e.magnitude,e,elapsed);
  else if (e.effectType==USB_EFFECT_RAMP) {
    if (e.duration==USB_DURATION_INFINITE || e.duration==0xffff) value=e.startMagnitude;
    else {
      int32_t center=((int32_t)e.endMagnitude+e.startMagnitude)/2;
      int32_t amplitude=envelopedMagnitude(((int32_t)e.endMagnitude-e.startMagnitude)/2,e,elapsed);
      value=center-amplitude+2*amplitude*(int32_t)elapsed/(e.duration ? e.duration : 1);
    }
  } else {
    uint16_t period=e.period<4 ? 4 : e.period;
    uint16_t phase=(uint32_t)(elapsed%period)*65536UL/period+(uint32_t)e.phase*65536UL/36000UL;
    int32_t wave=0;
    switch(e.effectType) {
      case USB_EFFECT_SINE:wave=sineWave(phase);break;
      case USB_EFFECT_SQUARE:wave=phase<32768 ? 10000 : -10000;break;
      case USB_EFFECT_TRIANGLE:wave=phase<32768 ? -10000+(int32_t)phase*20000/32768 : 30000-(int32_t)phase*20000/32768;break;
      case USB_EFFECT_SAWTOOTHUP:wave=-10000+(int32_t)phase*20000L/65536L;break;
      case USB_EFFECT_SAWTOOTHDOWN:wave=10000-(int32_t)phase*20000L/65536L;break;
      default:return 0;
    }
    value=e.offset+envelopedMagnitude(e.magnitude,e,elapsed)*wave/10000;
  }
  return steeringEffectValue(value,e.enableAxis);
}
}
