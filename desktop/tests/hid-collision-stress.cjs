// Logical collision-like load only. Never run with motor power connected.
const HID=require('node-hid'),fs=require('node:fs'),path=require('node:path');
if(!process.argv.includes('--motor-power-off'))throw Error('Exige fonte do motor desligada.');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const all=(await HID.devicesAsync()).filter(d=>[0x2341,0x2a03].includes(d.vendorId)&&d.productId===0x8036);
 const cfg=all.filter(d=>d.usagePage===0xff00&&d.usage===1),joy=all.filter(d=>d.usagePage===1&&d.usage===4);
 if(cfg.length!==1||joy.length!==1)throw Error('Esperada uma placa Malth.');
 let writer,reader,updates=0;const rows=[];
 async function sample(){const p=Buffer.from(await reader.getFeatureReport(0x41,64));
  if(p.length!==64||p[0]!==65)throw Error('Diagnóstico inválido.');
  const r={time:Date.now(),uptime:p.readUInt32LE(34),armed:p[2],force:p.readInt32LE(12),enabled:!!(p[32]&16),overruns:p.readUInt16LE(38),playing:p[47],received:p.readUInt16LE(50),rejected:p.readUInt16LE(52),min:p[8],max:p[9]};
  if(rows.length&&r.uptime<rows.at(-1).uptime)throw Error('Reinício detectado.');rows.push(r);return r;
 }
 async function output(bytes){const p=Buffer.alloc(20);Buffer.from(bytes).copy(p);await writer.write([...p]);}
 try{
  reader=await HID.HIDAsync.open(cfg[0].path);const before=await sample();
  if(!before.armed||before.playing||before.force)throw Error('Requer aplicativo conectado, sem jogo/efeitos ativos.');
  writer=await HID.HIDAsync.open(joy[0].path);
  await output([12,4]);await wait(20);await writer.sendFeatureReport([5,1,0,0]);
  const b=Buffer.from(await writer.getFeatureReport(6,5));if(b[2]!==1||!b[1])throw Error('Criação recusada.');const id=b[1];
  await output([1,id,1,255,127,0,0,0,0,255,0,4,63,0,0,0,0,0,0,0]);
  await wait(15);await output([10,id,1,1]);await wait(15);
  if(!(await sample()).playing)throw Error('Efeito não iniciou; ensaio inválido.');
  const start=Date.now();let lastSample=0;
  while(Date.now()-start<30000){
   const p=Buffer.alloc(4);p[0]=5;p[1]=id;
   p.writeInt16LE([10000,-10000,0,7000,-7000,1000,-1000,0][updates%8],2);
   await output(p);++updates;
   if(Date.now()-lastSample>=50){await sample();lastSample=Date.now();}
   await wait(1);
  }
  const result={updates,samples:rows.length,uptimeStart:rows[0].uptime,uptimeEnd:rows.at(-1).uptime,maxOverruns:Math.max(...rows.map(x=>x.overruns)),rejected:rows.at(-1).rejected-rows[0].rejected,forceMin:Math.min(...rows.map(x=>x.force)),forceMax:Math.max(...rows.map(x=>x.force))};
  console.log(JSON.stringify(result));if(result.rejected||result.forceMin>=0||result.forceMax<=0)throw Error('Ensaio sem cobertura de forças válidas em ambos sentidos.');
 }finally{
  if(writer){try{await output([12,4]);}finally{await writer.close();}}if(reader)await reader.close();
  fs.writeFileSync(path.resolve(__dirname,'../../firmware/build/hid-collision-stress-012.json'),JSON.stringify({updates,rows},null,2));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
