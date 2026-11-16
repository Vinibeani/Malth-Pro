const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { DeviceLink } = require('../device-link.cjs');
const { MotorSession } = require('../motor-session.cjs');

function harness(hello = {}, commitCentered) {
  const output = [], commands = []; let closed = false;
  const device = {
    async sendFeatureReport(packet) {
      assert.equal(packet.length,64); assert.equal(packet[0],0x40);
      const line=Buffer.from(packet.slice(2,2+packet[1])).toString().trim(); commands.push(line);
      const cmd=line.split(' ')[0];
      const message=cmd==='HELLO'?{type:'hello',device:'MalthPro',protocol:2,registers:65,firmware:'0.1.5',btsPwmDir:1,...hello}:
        cmd==='COMMIT'&&commitCentered!==undefined?{type:'ack',cmd,centered:commitCentered}:{type:'ack',cmd};
      const bytes=Buffer.from(JSON.stringify(message)+'\n');
      for(let i=0;i<bytes.length;i+=62) output.push(bytes.subarray(i,i+62));
      return 64;
    },
    async getFeatureReport() { const p=Buffer.alloc(64); p[0]=0x40; const data=output.shift(); if(data){p[1]=data.length;data.copy(p,2);} return p; },
    async close(){closed=true;},
  };
  const HID={ devicesAsync:async()=>[
    {path:'game',vendorId:0x2341,productId:0x8036,usagePage:1,usage:4},
    {path:'settings',vendorId:0x2341,productId:0x8036,usagePage:0xff00,usage:1},
    {path:'bootloader',vendorId:0x2341,productId:0x0036,usagePage:0xff00,usage:1}],
    HIDAsync:{open:async()=>device} };
  const context={Buffer,setTimeout,clearTimeout,module:{exports:{}},require:n=>n==='node-hid'?HID:require(n)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../hid-port.cjs'),'utf8'),context);
  return {...context.module.exports,device,commands,isClosed:()=>closed};
}
test('HID: seleciona somente coleção de configuração e remonta HELLO fragmentado',async()=>{
  const h=harness();const ports=await h.HidPort.list();assert.deepEqual(Array.from(ports,p=>p.path),['settings']);
  const port=new h.HidPort(ports[0]); const link=new DeviceLink(port);
  try{
    await new Promise((r,j)=>port.open(e=>e?j(e):r()));
    assert.equal((await link.handshake()).firmware,'0.1.5');
    const session=new MotorSession(link);
    assert.equal((await session.sendProfile({settings:{minforceCfg:0,maxForceCfg:100}})).forceEnabled,true);
    assert.deepEqual(h.commands.slice(-3),['COMMIT','CENTER','ARM']);
    await link.command('PING'); assert.equal(h.commands.at(-1),'PING');
    link.close(); await new Promise(r=>setTimeout(r,5));
    assert.equal(h.commands.at(-1),'DISARM'); assert(h.isClosed());
  }finally{link.close();}
});
test('HID: falha de polling cancela sessão; firmware não autenticado não recebe DISARM',async()=>{
  const h=harness(),port=new h.HidPort({path:'settings'}),link=new DeviceLink(port);
  await new Promise((r,j)=>port.open(e=>e?j(e):r()));
  h.device.getFeatureReport=async()=>{throw Error('HID transfer failed');};
  await new Promise(r=>setTimeout(r,20));
  assert(link.closed);assert(h.isClosed());assert.deepEqual(h.commands,[]);
});
test('FFB autônomo 0.2.0: conectar não recentraliza e fechar o app não envia DISARM',async()=>{
  const h=harness({firmware:'0.2.0',ffbAuto:1},1),port=new h.HidPort({path:'settings'}),link=new DeviceLink(port);
  try{
    await new Promise((r,j)=>port.open(e=>e?j(e):r()));
    await link.handshake(); assert.equal(link.ffbAuto,true);
    const session=new MotorSession(link);
    assert.equal((await session.sendProfile({settings:{minforceCfg:0,maxForceCfg:100}})).forceEnabled,false);
    assert.equal(h.commands.at(-1),'COMMIT'); assert(!h.commands.includes('CENTER')); assert(!h.commands.includes('ARM'));
    link.close(); await new Promise(r=>setTimeout(r,5));
    assert.equal(h.commands.at(-1),'COMMIT'); assert(!h.commands.includes('DISARM')); assert(h.isClosed());
  }finally{link.close();}
});
test('FFB autônomo 0.2.0: centraliza somente quando a placa perdeu o centro (CPR/INVERT)',async()=>{
  const h=harness({firmware:'0.2.0',ffbAuto:1},0),port=new h.HidPort({path:'settings'}),link=new DeviceLink(port);
  try{
    await new Promise((r,j)=>port.open(e=>e?j(e):r()));
    await link.handshake();
    const session=new MotorSession(link);
    await session.sendProfile({settings:{minforceCfg:0,maxForceCfg:100}});
    assert.deepEqual(h.commands.slice(-2),['COMMIT','CENTER']); assert(!h.commands.includes('ARM'));
  }finally{link.close();}
});
