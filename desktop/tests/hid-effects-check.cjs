// Controlled protocol/output audit. Requires motor powerOFF and games closed.
const HID=require('node-hid'),fs=require('node:fs'),path=require('node:path');
const {HidPort}=require('../hid-port.cjs');const {DeviceLink}=require('../device-link.cjs');
if(!process.argv.includes('--motor-power-off'))throw Error('Fonte12V deve estar desligada.');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const names=['Constant','Ramp','Square','Sine','Triangle','SawUp','SawDown','Spring','Damper','Inertia','Friction'];
(async()=>{
 const all=(await HID.devicesAsync()).filter(d=>[0x2341,0x2a03].includes(d.vendorId)&&d.productId===0x8036);
 const cfg=all.filter(d=>d.usagePage===0xff00&&d.usage===1),joy=all.filter(d=>d.usagePage===1&&d.usage===4);
 if(cfg.length!==1||joy.length!==1)throw Error('Esperada uma placa Malth.');
 const reader=await HID.HIDAsync.open(cfg[0].path);let writer,session;const rows=[],summary=[];
 async function sample(name){const p=Buffer.from(await reader.getFeatureReport(0x41,64));
  if(p.length!==64||p[0]!==65)throw Error('Diagnóstico inválido.');
  const r={name,time:Date.now(),armed:p[2],force:p.readInt32LE(12),position:p.readInt32LE(16),range:p.readInt32LE(20),a:p.readUInt16LE(24),b:p.readUInt16LE(26),enabled:!!(p[32]&16),settling:p[44],playing:p[47],allocated:p[49],received:p.readUInt16LE(50),rejected:p.readUInt16LE(52),type:p[58],local:p[10]};rows.push(r);return r;}
 async function output(b){const p=Buffer.alloc(20);Buffer.from(b).copy(p);await writer.write([...p]);await wait(12);}
 async function block(type){await output([12,4]);await writer.sendFeatureReport([5,type,0,0]);const b=Buffer.from(await writer.getFeatureReport(6,5));if(b[2]!==1||!b[1])throw Error('Criação recusada.');return b[1];}
 function condition(id,offset){const p=Buffer.alloc(15);p[0]=3;p[1]=id;p[2]=0;p.writeInt16LE(offset,3);p.writeInt16LE(5000,5);p.writeInt16LE(5000,7);p.writeUInt16LE(10000,9);p.writeUInt16LE(10000,11);return p;}
 async function effect(type,fast=false){const id=await block(type),name=fast?'Square250Hz':names[type-1];
  await output([1,id,type,type===2?250:255,type===2?0:127,0,0,0,0,255,0,4,63,0,0,0,0,0,0,0]);
  if(type===1)await output([5,id,0xd0,7]);
  else if(type===2)await output([6,id,0x30,0xf8,0xd0,7]);
  else if(type<=7){const p=Buffer.alloc(12);p[0]=4;p[1]=id;p.writeUInt16LE(2000,2);p.writeUInt32LE(fast?4:100,8);await output(p);}
  else await output(condition(id,5000));
  await output([10,id,1,1]);const start=Date.now(),samples=[];let reversed=false;
  while(Date.now()-start<(fast?1500:320)){
   if(type>=8&&!reversed&&Date.now()-start>160){await output(condition(id,-5000));reversed=true;}
   samples.push(await sample(name));await wait(5+samples.length%7);
  }
  const s={name,samples:samples.length,playing:samples.filter(x=>x.playing&&x.type===type).length,nonzero:samples.filter(x=>x.force).length,enabled:samples.filter(x=>x.enabled).length,settling:samples.filter(x=>x.settling).length,forceMin:Math.min(...samples.map(x=>x.force)),forceMax:Math.max(...samples.map(x=>x.force)),maxCompare:Math.max(...samples.map(x=>Math.max(x.a,x.b))),rejected:samples.at(-1).rejected-samples[0].rejected};
  summary.push(s);console.log(JSON.stringify(s));await output([12,4]);
 }
 try{let before=await sample('before');
  if(process.argv.includes('--own-session')){
   if(before.armed||before.allocated||before.local)throw Error('Feche o Malth Pro e jogos para a sessão isolada.');
   const port=new HidPort({path:cfg[0].path});session=new DeviceLink(port);
   await new Promise((r,j)=>port.open(e=>e?j(e):r()));const hello=await session.handshake();console.log(JSON.stringify({firmware:hello.firmware,session:'isolated, no profile/EEPROM changes'}));
   const p=Buffer.from(await reader.getFeatureReport(0x41,64));if(!p[3])await session.command('CENTER');
   await session.command('ARM');before=await sample('session-ready');
  }
  if(!before.armed||before.allocated||before.local||before.force||Math.abs(before.position)>=before.range)throw Error('Exige sessão ativa sem efeitos e dentro do curso.');writer=await HID.HIDAsync.open(joy[0].path);
  await effect(3,true);
  if(!process.argv.includes('--only-fast'))for(let type=1;type<=11;++type)await effect(type);
 }finally{if(writer){try{await output([12,4]);}catch{}await writer.close();}await reader.close();session?.close();await wait(80);
  const target=process.argv.find(x=>x.startsWith('--out='))?.slice(6)||path.resolve(__dirname,'../../firmware/build/hid-effects-check-last.json');fs.writeFileSync(target,JSON.stringify({summary,rows},null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
