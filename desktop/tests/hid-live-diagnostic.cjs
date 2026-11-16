// Leitura independente do Feature0x41: nao consome a fila0x40 nem envia comandos.
const HID=require('node-hid');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const ports=(await HID.devicesAsync()).filter(d=>[0x2341,0x2a03].includes(d.vendorId)&&d.productId===0x8036&&d.usagePage===0xff00&&d.usage===1);
 if(ports.length!==1)throw Error('Esperada uma coleção de configuração.');
 const device=await HID.HIDAsync.open(ports[0].path);const rows=[];
 const seconds=Number(process.argv[2]||5);const end=Date.now()+seconds*1000;
 try{
  while(Date.now()<end){
   const p=Buffer.from(await device.getFeatureReport(0x41,64));
   if(p.length!==64||p[0]!==0x41||p[1]!==1)throw Error('Diagnóstico indisponível.');
   const r={time:new Date().toISOString(),armed:p[2],centered:p[3],missed:p[4],pid:p[5],paused:p[6],mode:p[7],min:p[8],max:p[9],effect:p[10],effectForce:p[11],force:p.readInt32LE(12),position:p.readInt32LE(16),halfRange:p.readInt32LE(20),ocrA:p.readUInt16LE(24),ocrB:p.readUInt16LE(26),top:p.readUInt16LE(28),tccrA:p[30],tccrB:p[31],enableD8:Boolean(p[32]&16),ddr:p[33],uptime:p.readUInt32LE(34),overruns:p.readUInt16LE(38),pwmHz:p.readUInt16LE(40),cpr:p.readUInt16LE(42),settling:p[44],motorMode:p[45]};
   r.ffb={gain:p[46],playing:p[47],lastReport:p[48],allocated:p[49],received:p.readUInt16LE(50),rejected:p.readUInt16LE(52),created:p.readUInt16LE(54),axes:p[56],direction:p[57],type:p[58],effectId:p[59],magnitude:p.readInt16LE(60),lastControl:p[62],lastFree:p[63]};
   rows.push(r);if(rows.length===1||(!process.argv.includes('--quiet')&&rows.length%20===0))console.log(JSON.stringify(r));
   await new Promise(r=>setTimeout(r,50));
  }
 }finally{await device.close();fs.writeFileSync(path.resolve(__dirname,'../../firmware/build/hid-diagnostic-last.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify({samples:rows.length,minPosition:Math.min(...rows.map(r=>r.position)),maxPosition:Math.max(...rows.map(r=>r.position)),maxForce:Math.max(...rows.map(r=>Math.abs(r.force))),enabledSamples:rows.filter(r=>r.enableD8).length,maxOverruns:Math.max(...rows.map(r=>r.overruns))}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
