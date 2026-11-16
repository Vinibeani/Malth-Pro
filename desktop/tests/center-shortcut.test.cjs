const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {CenterShortcut}=require('../center-shortcut.cjs');
test('atalho persiste, restaura anterior se ocupado e não repete CENTER ao segurar',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'malth-shortcut-'));const callbacks=new Map();let calls=0;
 const api={register:(key,cb)=>{if(key==='F12')return false;callbacks.set(key,cb);return true;},unregister:key=>callbacks.delete(key)};
 const file=path.join(dir,'shortcut.json'),s=new CenterShortcut(api,file,()=>{calls++;});
 try{s.set({type:'keyboard',key:'Ctrl+F9'});assert.throws(()=>s.set({type:'keyboard',key:'F12'}),/ocupado/);assert(callbacks.has('Ctrl+F9'));
 callbacks.get('Ctrl+F9')();callbacks.get('Ctrl+F9')();await new Promise(r=>setImmediate(r));assert.equal(calls,1);
 const restored=new CenterShortcut(api,file,()=>{});assert.deepEqual(restored.load(),{type:'keyboard',key:'Ctrl+F9'});
 s.set({type:'gamepad',button:4});assert(!callbacks.has('Ctrl+F9'));s.set(null);assert.equal(JSON.parse(fs.readFileSync(file)),null);
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('perfil desabilita acelerador e freio sem alterar os demais canais',()=>{
 const {encodeProfile}=require('../device-protocol.cjs');
 assert.equal(encodeProfile({settings:{enableAccelCfg:false,enableBrakeCfg:false,enableClutchCfg:true,enableHandbrakeCfg:true}})[6],12);
 assert.equal(encodeProfile({settings:{}})[6],3);
});
