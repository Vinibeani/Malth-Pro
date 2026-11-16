// Explicit hardware protocol check: motor power must be off, game closed.
// Sends Disable and Reset only. Does not create effects or alter the profile.
const HID=require('node-hid');const fs=require('node:fs');const path=require('node:path');
if(!process.argv.includes('--motor-power-off'))throw Error('Confirme a fonte desligada com --motor-power-off.');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const all=(await HID.devicesAsync()).filter(d=>[0x2341,0x2a03].includes(d.vendorId)&&d.productId===0x8036);
 const cfg=all.filter(d=>d.usagePage===0xff00&&d.usage===1);
 const joy=all.filter(d=>d.usagePage===1&&d.usage===4);
 if(cfg.length!==1||joy.length!==1)throw Error('Esperadas duas coleções da única placa Malth.');
 const reader=await HID.HIDAsync.open(cfg[0].path);let writer;const rows=[];
 async function sample(stage){const p=Buffer.from(await reader.getFeatureReport(0x41,64));
  if(p.length!==64||p[0]!==0x41||p[1]!==1)throw Error('Diagnóstico inválido.');
  const r={stage,status:p[5],paused:p[6],force:p.readInt32LE(12),position:p.readInt32LE(16),halfRange:p.readInt32LE(20),effect:p[10],allocated:p[49],received:p.readUInt16LE(50),lastControl:p[62],lastFree:p[63]};rows.push(r);return r;}
 try{
  const before=await sample('before');
  if(before.allocated||before.effect||Math.abs(before.position)>=before.halfRange||before.force)throw Error('Teste exige ausência de efeitos e posição dentro do curso.');
  writer=await HID.HIDAsync.open(joy[0].path);
  async function command(value){const packet=Buffer.alloc(20);packet[0]=12;packet[1]=value;await writer.write([...packet]);await wait(100);}
  await command(2);const disabled=await sample('disabled');
  if((disabled.status&2)||disabled.lastControl!==2)throw Error('Disable não confirmado.');
  await command(4);const reset=await sample('reset');
  if(!(reset.status&2)||reset.paused||reset.allocated||reset.lastControl!==4||reset.force)throw Error('Reset não cumpriu USB PID5.13.');
  console.log(JSON.stringify({passed:true,rows}));
 }finally{await writer?.close();await reader.close();fs.writeFileSync(path.resolve(__dirname,'../../firmware/build/hid-reset-check-last.json'),JSON.stringify(rows,null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
