const {test}=require('node:test');
const assert=require('node:assert/strict');
const {calibrated,brake}=require('../../malth-control/pedal-math.js');
const {encodeProfile}=require('../device-protocol.cjs');
test('Hall decrescente preserva solto=0, curso completo=1023 e a curva entre eles',()=>{
  const curve=[10,41,92,164,256,368,501,655,829,1023];
  assert.deepEqual([900,800,550,300,100].map(raw=>calibrated(raw,800,300)),[0,0,511,1023,1023]);
  assert.deepEqual([900,800,550,300,100].map(raw=>brake(calibrated(raw,800,300),curve)),[0,0,255,1023,1023]);
  let previous=0;
  for(let raw=1023;raw>=0;raw--){const value=brake(calibrated(raw,800,300),curve);assert(value>=previous&&value<=1023);previous=value;}
});
test('perfil transporta polaridade do Hall e rejeita calibracao que vira intervalo zero no ADC',()=>{
  const profile={settings:{},pedalCalibration:{brake:{min:800/1023*100,max:300/1023*100}}};
  assert.deepEqual(encodeProfile(profile).slice(9,11),[800,300]);
  profile.pedalCalibration.brake={min:40,max:40.000001};
  assert.throws(()=>encodeProfile(profile),/leituras diferentes/);
});
