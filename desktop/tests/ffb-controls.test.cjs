const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {encodeProfile}=require('../device-protocol.cjs');
const root=path.resolve(__dirname,'../..');
const mapping={hardLockCfg:'HARDLOCK',softLockCfg:'SOFTLOCK',minforceCfg:'MIN_FORCE',maxForceCfg:'MAX_FORCE',gainConstantCfg:'CONSTANT_GAIN',gainSpringCfg:'SPRING_GAIN',gainSineCfg:'SINE_GAIN',gainDamperCfg:'DAMPER_GAIN',gainFrictionCfg:'FRICTION_GAIN',gainInertiaCfg:'INERTIA_GAIN',damperFilterCfg:'DAMPER_FILTER',frictionFilterCfg:'FRICTION_FILTER',inertiaFilterCfg:'INERTIA_FILTER',effectTypeCfg:'DESKTOP_EFFECT',desktopEffectForceCfg:'DESKTOP_FORCE',constantScaleCfg:'CONSTANT_SCALE',springScaleCfg:'SPRING_SCALE',sineScaleCfg:'SINE_SCALE'};
test('todas as18 opções manuais visíveis do FFB chegam ao registrador correspondente',()=>{
 const html=fs.readFileSync(path.join(root,'malth-control/index.html'),'utf8').split('id="page-output"')[1].split('id="page-shifter"')[0];
 const js=fs.readFileSync(path.join(root,'malth-control/app.js'),'utf8').split('const effectOptions = [')[1].split('];')[0];
 const visible=[...html.matchAll(/data-setting="([^"]+)"/g)].map(m=>m[1]).concat([...js.matchAll(/(?:force|adjustment): '([^']+)'/g)].map(m=>m[1]));
 assert.deepEqual(new Set(visible),new Set(Object.keys(mapping)));
 const registers=fs.readFileSync(path.join(root,'firmware/Leonardo/MalthProLeonardo/Config.h'),'utf8').match(/enum Register : uint8_t\s*\{([\s\S]*?)REGISTER_COUNT/)[1].split(',').map(x=>x.trim());
 const baseline=encodeProfile({settings:{}});
 for(const [key,reg] of Object.entries(mapping)){
  const value=key==='effectTypeCfg'?'Friction':key==='maxForceCfg'?10:baseline[registers.indexOf(reg)]===100?0:100;
  const actual=encodeProfile({settings:{[key]:value}}),idx=registers.indexOf(reg);
  assert(idx>=0,reg);assert.equal(actual[idx],key==='effectTypeCfg'?3:value,key);
  assert.deepEqual(actual.filter((_v,i)=>i!==idx),baseline.filter((_v,i)=>i!==idx),key+' alterou outro ajuste');
 }
});
