const fs=require('node:fs');
class CenterShortcut {
 constructor(api,file,center){this.api=api;this.file=file;this.center=center;this.value=null;this.busy=false;this.last=0;}
 fire(){if(this.busy||Date.now()-this.last<700)return;this.last=Date.now();this.busy=true;Promise.resolve().then(this.center).catch(()=>{}).finally(()=>{this.busy=false;});}
 set(value,persist=true){
  if(value!==null&&!(value?.type==='keyboard'&&typeof value.key==='string'&&/^(?:(?:Ctrl|Alt|Shift|Super)\+)*(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Enter|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Up|Down|Left|Right)$/.test(value.key))&&!(value?.type==='gamepad'&&Number.isInteger(value.button)&&value.button>=0&&value.button<32))throw Error('Escolha uma tecla ou botão válido.');
  const old=this.value;
  if(old?.type==='keyboard'&&old.key!==value?.key)this.api.unregister(old.key);
  try{if(value?.type==='keyboard'&&old?.key!==value.key&&!this.api.register(value.key,()=>this.fire()))throw Error('Atalho ocupado por outro programa. Escolha outro.');
   if(persist)fs.writeFileSync(this.file,JSON.stringify(value));this.value=value;return value;
  }catch(e){if(value?.type==='keyboard'&&old?.key!==value.key)this.api.unregister(value.key);if(old?.type==='keyboard'&&old.key!==value?.key)this.api.register(old.key,()=>this.fire());throw e;}
 }
 load(){try{this.set(JSON.parse(fs.readFileSync(this.file,'utf8')),false);}catch{this.value=null;}return this.value;}
}
module.exports={CenterShortcut};
