const {app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');app.setPath('userData',path.join(root,'firmware/build/shortcuts-ui'));app.disableHardwareAcceleration();
let shortcut=null,profile;
ipcMain.handle('shortcut:get',()=>shortcut);ipcMain.handle('shortcut:set',(_e,v)=>shortcut=v);ipcMain.handle('shortcut:capture',()=>{});
ipcMain.handle('device:connect',()=>({}));ipcMain.handle('device:command',()=>({}));ipcMain.handle('device:send-profile',(_e,p)=>{profile=p;return {sent:true,applied:true};});
app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1080,height:620,webPreferences:{preload:path.join(root,'desktop/preload.cjs'),sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
try{await win.loadFile(path.join(root,'malth-control/index.html'));const run=s=>win.webContents.executeJavaScript(s);await new Promise(r=>setTimeout(r,150));
 await run(`for(const key of ['enableAccelCfg','enableBrakeCfg']){const e=document.querySelector('[data-setting="'+key+'"]');e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));e.dispatchEvent(new Event('input',{bubbles:true}));}`);
 assert.deepEqual(await run(`['accel','brake'].map(p=>document.querySelector('[data-capture-pedal="'+p+'"]').disabled)`),[true,true]);
 win.webContents.send('device:state',{state:'connected'});await new Promise(r=>setTimeout(r,150));await run(`document.querySelector('#saveProfile').click()`);await new Promise(r=>setTimeout(r,200));
 assert.equal(profile.settings.enableAccelCfg,false);assert.equal(profile.settings.enableBrakeCfg,false);
 await run(`document.querySelector('#chooseCenterShortcut').click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'F9',code:'F9',ctrlKey:true,bubbles:true}));`);await new Promise(r=>setTimeout(r,100));assert.deepEqual(shortcut,{type:'keyboard',key:'Ctrl+F9'});
 await run(`document.querySelector('#chooseCenterShortcut').click();Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{id:'Malth Pro',connected:true,index:0,buttons:[{pressed:false},{pressed:true}]}]});`);await new Promise(r=>setTimeout(r,180));assert.deepEqual(shortcut,{type:'gamepad',button:1});
 await run(`document.querySelector('[data-tab="settings"]').click()`);
 await run(`{const e=document.querySelector('#accentColorValue');e.value='#F00';e.dispatchEvent(new Event('change',{bubbles:true}));}`);
 assert.equal(await run(`document.documentElement.style.getPropertyValue('--cyan')`),'#ff0000');
 assert.equal(await run(`document.querySelector('#accentColorValue').value`),'#FF0000');
 await run(`{const e=document.querySelector('#accentColorValue');e.value='#22A9D4';e.dispatchEvent(new Event('change',{bubbles:true}));}`);
 assert.equal(await run(`document.querySelector('#accentColorValue').value`),'#22A9D4');
 await new Promise(r=>setTimeout(r,200));
 fs.writeFileSync(path.join(root,'firmware/build/shortcuts-134.png'),(await win.webContents.capturePage()).toPNG());console.log('UI: pedais desligados/perfil e captura teclado/botão aprovados.');
}catch(e){console.error(e);process.exitCode=1;}finally{win.destroy();app.quit();}});


