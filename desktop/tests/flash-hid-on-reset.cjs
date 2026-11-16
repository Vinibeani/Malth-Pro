const { SerialPort } = require('serialport');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname,'../..');
const tools = path.join(root,'firmware/tooling/data/packages/arduino/tools/avrdude/8.0.0-arduino1');
const image = path.join(root,'firmware/releases/Malth Pro-v0.2.0.hex');
(async()=>{
  console.log('Aguardando RESET físico do Leonardo (até 5 minutos). Motor deve permanecer sem alimentação.');
  const deadline=Date.now()+300000;
  while(Date.now()<deadline){
    const ports=(await SerialPort.list()).filter(p=>['2341','2a03'].includes(String(p.vendorId).toLowerCase()) && String(p.productId).toLowerCase()==='0036');
    if(ports.length>1) throw Error('Mais de um bootloader encontrado; nenhuma gravação iniciada.');
    if(ports.length===1){
      console.log('Bootloader Leonardo identificado:',ports[0].path);
      execFileSync(path.join(tools,'bin/avrdude.exe'),['-C'+path.join(tools,'etc/avrdude.conf'),'-p','atmega32u4','-c','avr109','-P',ports[0].path,'-b','57600','-D','-U','flash:w:'+image+':i'],{stdio:'inherit',timeout:60000,windowsHide:true});
      console.log('Gravação e verificação concluídas.'); return;
    }
    await new Promise(r=>setTimeout(r,150));
  }
  throw Error('RESET não detectado; nenhuma gravação iniciada.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
