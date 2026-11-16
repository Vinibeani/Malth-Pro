const {app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');app.disableHardwareAcceleration();app.setPath('userData',path.join(root,'firmware/build/shifter-ui-profile'));let saved;
for(const n of ['shortcut:get','shortcut:set','shortcut:capture','device:connect','device:command'])ipcMain.handle(n,()=>null);
ipcMain.handle('device:send-profile',(_e,p,o)=>{saved=p;return {sent:true,applied:true,persisted:!!o?.persist};});
app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,frame:false,width:1080,height:620,webPreferences:{preload:path.join(root,'desktop/preload.cjs'),sandbox:true,contextIsolation:true,offscreen:true}});
const run=s=>w.webContents.executeJavaScript(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
function raw(x,y,gear=0){w.webContents.send('device:message',{type:'state',raw:[0,0,0,0,x,y],steering:0,gear,armed:0,centered:1,overruns:0});}
try{await w.loadFile(path.join(root,'malth-control/index.html'));await run('localStorage.clear()');await w.reload();await wait(250);w.webContents.setZoomFactor(1.2);
w.webContents.send('device:state',{state:'connected'});raw(500,500);await wait(120);
await run(`document.querySelector('[data-tab="shifter"]').click();document.querySelector('#calibrateButton').click()`);
assert.deepEqual(await run(`Array.from(document.querySelectorAll('#shifterCaptureControls button')).map(e=>e.textContent)`),['1','2','3','4','5','6','7','R']);
assert.equal(await run(`Array.from(document.querySelectorAll('.gear-cell')).every(e=>!e.textContent)`),true);
await run(`document.querySelector('#okShifter').click()`);await wait(100);assert.equal(await run(`document.querySelector('#calibrateButton').getAttribute('aria-pressed')`),'true');
const gears=['1','2','3','4','5','6','7','R'];for(let i=0;i<8;++i){raw(400+Math.floor(i/2)*70,i%2?550:450);await wait(75);await run(`document.querySelector('[data-gear="${gears[i]}"]').click()`);}
assert.equal(await run(`document.querySelectorAll('.gear-cell.is-captured').length`),8);
assert.equal(await run(`document.querySelector('.map-thresholds [data-value="xMinCfg"]').textContent`),'400');
assert.equal(await run(`document.querySelectorAll('.map-thresholds input').length`),0);
await run(`document.querySelector('#toast').classList.remove('is-visible')`);await wait(200);
fs.writeFileSync(path.join(root,'firmware/build/shifter-calibration-138.png'),(await w.webContents.capturePage()).toPNG());
await run(`document.querySelector('#okShifter').click()`);await wait(200);
assert.deepEqual([saved.settings.xLowCfg,saved.settings.xMidCfg,saved.settings.xHighCfg,saved.settings.yLowCfg,saved.settings.yHighCfg],[435,505,575,483,517]);
assert.equal(saved.settings.shifterCapturedGears.length,8);assert.equal(await run(`document.querySelector('#calibrateButton').getAttribute('aria-pressed')`),'false');
await run(`document.querySelector('#calibrateButton').click()`);raw(450,460);await wait(75);await run(`document.querySelector('#shifterCaptureControls [data-gear="1"]').click()`);
await run(`{const e=document.querySelector('[data-setting="shifterModeCfg"]');e.value='0';e.dispatchEvent(new Event('change',{bubbles:true}));}`);
await run(`document.querySelector('#saveProfile').click()`);await wait(150);raw(500,500,8);await wait(150);
assert.equal(saved.settings.gear1XCfg,400);assert.equal(saved.settings.shifterCapturedGears.length,8);
assert.equal(await run(`document.querySelector('#currentGear').textContent`),'R');
console.log('UI: oito capturas visíveis, faixas reais, limites calculados/salvos, Concluir incompleto bloqueado, ré nativa exibida.');
}catch(e){console.error(e);process.exitCode=1;}finally{w.destroy();app.quit();}});
