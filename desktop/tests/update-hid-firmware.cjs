// Operator-authorized update only. Motor power must already be off.
// Read EEPROM/flash before writing; keep EEPROM unchanged and verify it after.
const { SerialPort }=require('serialport');
const { execFileSync }=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const image=path.resolve(process.argv[2]||'');
const release=path.join(root,'firmware/releases');
if(path.dirname(image)!==release||!/^Malth Pro-v[0-9.]+\.hex$/.test(path.basename(image))||!fs.existsSync(image))throw Error('Selecione uma imagem Malth em firmware/releases.');
const tooling=path.join(root,'firmware/tooling/data/packages/arduino/tools/avrdude/8.0.0-arduino1');
const out=path.join(root,'firmware/build',`update-${new Date().toISOString().replace(/[:.]/g,'-')}`);
fs.mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const leonardo=p=>['2341','2a03'].includes(String(p.vendorId).toLowerCase());
(async()=>{
 let normal=(await SerialPort.list()).filter(p=>leonardo(p)&&String(p.productId).toLowerCase()==='8036');
 if(normal.length!==1)throw Error('Esperada exatamente uma placa Leonardo; nenhuma gravação iniciada.');
 const touch=new SerialPort({path:normal[0].path,baudRate:1200,autoOpen:false});
 await new Promise((r,j)=>touch.open(e=>e?j(e):r()));
 await new Promise((r,j)=>touch.set({dtr:false},e=>e?j(e):r()));
 await wait(80);await new Promise(r=>touch.close(()=>r()));
 let boot;
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){let ports=(await SerialPort.list()).filter(p=>leonardo(p)&&String(p.productId).toLowerCase()==='0036');if(ports.length>1)throw Error('Mais de um bootloader; abortado.');if(ports.length===1){boot=ports[0];break;}await wait(150);}
 if(!boot)throw Error('Bootloader não encontrado; nenhuma gravação executada.');
 const before=path.join(out,'eeprom-before.bin'),after=path.join(out,'eeprom-after.bin');
 const args=['-C'+path.join(tooling,'etc/avrdude.conf'),'-p','atmega32u4','-c','avr109','-P',boot.path,'-b','57600','-D',
 '-U',`eeprom:r:${before}:r`,'-U',`flash:r:${path.join(out,'flash-before.bin')}:r`,
 '-U',`flash:w:${image}:i`,'-U',`eeprom:r:${after}:r`];
 execFileSync(path.join(tooling,'bin/avrdude.exe'),args,{stdio:'inherit',timeout:60000,windowsHide:true});
 if(!fs.readFileSync(before).equals(fs.readFileSync(after)))throw Error('A conferência da EEPROM não corresponde; preserve os backups.');
 const result={image:path.basename(image),portBefore:normal[0].path,bootPort:boot.path,eepromUnchanged:true,backupDirectory:path.relative(root,out),time:new Date().toISOString()};
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
