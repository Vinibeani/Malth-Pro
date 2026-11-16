const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('PID declara somente X dentro da junta fisica e preserva o tamanho dos reports',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../../firmware/libraries/JoystickFFB/src/FFBDescriptor.h'),'utf8').replace(/\/\/[^\n]*/g,'');
  const initializer=source.match(/pidReportDescriptor\[\]\s*PROGMEM\s*=\s*\{([\s\S]*?)\};/)[1];
  const bytes=initializer.split(',').map(x=>x.trim()).filter(Boolean).map(x=>x==='MAX_EFFECTS'?6:Number(x));
  assert(bytes.every(x=>Number.isInteger(x)&&x>=0&&x<=255));
  const globals={};const collections=[{type:1,page:1,usage:4}];let usages=[];const bits={};const actuators=[];let direction;
  for(let offset=0;offset<bytes.length;){
    const prefix=bytes[offset++];assert.notEqual(prefix,0xfe,'sem item longo inesperado');
    const length=[0,1,2,4][prefix&3],type=(prefix>>2)&3,tag=prefix>>4;
    let value=0;for(let i=0;i<length;i++)value+=bytes[offset++]*2**(8*i);
    if(type===1){globals[tag]=value;continue;}
    if(type===2){if(tag===0)usages.push(value);continue;}
    if(type!==0)continue;
    if(tag===10)collections.push({type:value,page:globals[0],usage:usages.at(-1)});
    else if(tag===12){assert(collections.length);collections.pop();}
    else if([8,9,11].includes(tag)){
      const key=tag+':'+globals[8],start=bits[key]||0;
      bits[key]=start+globals[7]*globals[9];
      if(tag===9&&!(value&1)&&collections.some(c=>c.page===15&&c.usage===0x55)){
        assert(collections.some(c=>c.type===0),'atuador deve pertencer a junta fisica');
        assert.equal(globals[7],1);assert.equal(globals[9],1);
        actuators.push(...usages.map(usage=>[globals[0],usage]));
      }
      if(tag===9&&globals[0]===15&&usages.includes(0x56))direction=start;
    }
    usages=[];
  }
  // O array PID fecha tambem a Application aberta no descritor de entrada.
  assert.deepEqual(actuators,[[1,0x30]]);
  assert.equal(direction,82,'bit Direction Enable continua em data[11] bit2');
  assert.equal(1+bits['9:1']/8,20,'Set Effect preserva offsets anteriores e acrescenta Start Delay');
  assert.equal(1+bits['9:5']/8,4,'Constant Force inclui magnitude assinada16');
  assert.equal(1+bits['11:5']/8,4,'Create New Effect');
});
