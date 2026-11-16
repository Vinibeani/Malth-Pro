// Explicit diagnostic only: game closed and motor12V OFF required.
const HID=require('node-hid'),fs=require('node:fs'),path=require('node:path');
if(!process.argv.includes('--motor-power-off'))throw Error('Fonte12V deve estar desligada.');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const all=(await HID.devicesAsync()).filter(d=>[0x2341,0x2a03].includes(d.vendorId)&&d.productId===0x8036);
 const cfg=all.filter(d=>d.usagePage===0xff00&&d.usage===1),joy=all.filter(d=>d.usagePage===1&&d.usage===4);
 if(cfg.length!==1||joy.length!==1)throw Error('Placa única não identificada.');
 const reader=await HID.HIDAsync.open(cfg[0].path);let writer;const rows=[];
 async function sample(stage){const p=Buffer.from(await reader.getFeatureReport(0x41,64));const r={stage,armed:p[2],position:p.readInt32LE(16),range:p.readInt32LE(20),force:p.readInt32LE(12),a:p.readUInt16LE(24),b:p.readUInt16LE(26),allocated:p[49],local:p[10]};rows.push(r);return r;}
 async function output(bytes){const b=Buffer.alloc(20);Buffer.from(bytes).copy(b);await writer.write([...b]);await wait(120);}
 try{const before=await sample('before');if(!before.armed||before.allocated||before.local||before.force||Math.abs(before.position)>=before.range)throw Error('Exige sessão ativa, sem efeitos e dentro do curso.');
  writer=await HID.HIDAsync.open(joy[0].path);await output([12,4]);
  await writer.sendFeatureReport([5,1,0,0]);const block=Buffer.from(await writer.getFeatureReport(6,5));
  if(block[2]!==1||!block[1])throw Error('Criação do efeito não confirmada.');const id=block[1];
  await output([1,id,1,255,127,0,0,0,0,255,0,4,63,0,0,0,0,0,0,0]);
  await output([5,id,0xb8,0x0b]);await output([10,id,1,1]);const positive=await sample('incoming+3000');
  if(positive.force>=0||!positive.a||positive.b)throw Error('Polariade +X incorreta.');
  await output([5,id,0x48,0xf4]);const negative=await sample('incoming-3000');
  if(negative.force<=0||negative.a||!negative.b)throw Error('Polaridade -X incorreta.');
  console.log(JSON.stringify({passed:true,rows}));
 }finally{if(writer){try{await output([12,4]);}catch{}await writer.close();}await reader.close();fs.writeFileSync(path.resolve(__dirname,'../../firmware/build/hid-force-direction-check-last.json'),JSON.stringify(rows,null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
