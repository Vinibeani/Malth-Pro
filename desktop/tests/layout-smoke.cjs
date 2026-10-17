const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { encodeProfile } = require('../device-protocol.cjs');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'firmware/build/screenshots-' + require('../package.json').version);
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(root, 'firmware/build/layout-test-profile'));
app.disableHardwareAcceleration();
ipcMain.handle('device:connect', () => ({ connected: false }));
ipcMain.handle('device:send-profile', () => ({ sent: true, applied: true }));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, frame: false, width: 1080, height: 620,
    webPreferences: { preload: path.join(root, 'desktop/preload.cjs'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  const evaluate = (source) => win.webContents.executeJavaScript(source);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 120));
  const capture = async (name) => { await settle(); fs.writeFileSync(path.join(output, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  const checkBounds = async () => {
    const overflow = await evaluate(`Array.from(document.querySelectorAll('.page.is-active .panel, .page.is-active button, .page.is-active select, .bottom-bar > *, dialog[open]'))
      .filter(el => el.getClientRects().length).map(el => ({id:el.id || el.className,rect:el.getBoundingClientRect().toJSON()}))
      .filter(({rect:r}) => r.x < -1 || r.y < -1 || r.right > innerWidth+1 || r.bottom > innerHeight+1)`);
    assert.deepEqual(overflow, [], 'Controles fora da janela: ' + JSON.stringify(overflow));
  };
  try {
    await win.loadFile(path.join(root, 'malth-control/index.html'));
    await evaluate('localStorage.clear()');
    const loaded = new Promise((resolve) => win.webContents.once('did-finish-load', resolve)); win.reload(); await loaded;
    win.webContents.setZoomFactor(1.2); await settle();
    assert.deepEqual(win.getSize(), [1080, 620]);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.tab')).map(el=>el.textContent)`), ['Principal','Force Feedback','Câmbio']);
    await checkBounds(); await capture('principal');
    await evaluate(`document.querySelector('#brakeLinearity').click()`);
    await checkBounds(); await capture('linearidade');
    await evaluate(`document.querySelector('#linearityDone').click(); document.querySelector('[data-tab="output"]').click()`);
    await checkBounds(); await capture('retorno-de-forca');
    const choices = await evaluate(`Array.from(document.querySelector('[data-setting="effectTypeCfg"]').options).map(el=>({value:el.value,label:el.textContent}))`);
    assert.deepEqual(choices, [{value:'Off',label:'Desligado'},{value:'Spring',label:'Mola'},{value:'Damper',label:'Amortecimento'},{value:'Friction',label:'Atrito'}]);
    for (const [i, option] of choices.entries()) assert.equal(encodeProfile({settings:{effectTypeCfg:option.value}})[60], i);
    await evaluate(`const effect=document.querySelector('[data-setting="effectTypeCfg"]'); effect.value='Spring'; effect.dispatchEvent(new Event('input',{bubbles:true}));`);
    assert.equal(await evaluate(`document.querySelector('#desktopEffectStatus').textContent`), 'Mola');
    await evaluate(`document.querySelector('[data-tab="shifter"]').click()`);
    await checkBounds(); await capture('cambio-em-h');
    await evaluate(`const mode=document.querySelector('[data-setting="shifterModeCfg"]'); mode.value='0'; mode.dispatchEvent(new Event('change',{bubbles:true}));`);
    await settle();
    const geometry = await evaluate(`(() => { const gate=document.querySelector('#shifterGate'), map=document.querySelector('.coordinate-map');
      return {ratio:gate.getBoundingClientRect().width/map.getBoundingClientRect().width,
        xHidden:getComputedStyle(document.querySelector('#shifterXReadoutRow')).display==='none',
        hiddenSliders:Array.from(document.querySelectorAll('.threshold-slider-x')).every(el=>getComputedStyle(el).display==='none'),
        backLabelVisible:document.querySelector('#mapYBottomLabel').getBoundingClientRect().top>=gate.getBoundingClientRect().bottom};})()`);
    assert(geometry.ratio > .8, 'O painel sequencial deve aproveitar a largura do mapa.');
    assert(geometry.xHidden && geometry.hiddenSliders);
    assert(geometry.backLabelVisible, 'O rotulo Tras deve ficar visivel abaixo do painel.');
    await checkBounds(); await capture('cambio-sequencial');
    await evaluate(`document.querySelector('#settingsJump').click()`);
    await checkBounds(); await capture('configuracoes');
    const foreignLabels = await evaluate(`Array.from(document.querySelectorAll('button,label,option,.settings-legend,.profile-label,.effect-head,.effect-secondary'))
      .map(el=>el.textContent.trim().replaceAll('H-Shifter','')).filter(text=>/\\b(?:Shifter|Angle|Center|Accel|Brake|Clutch|HandBrake|HardLock|SoftLock|Desktop|Calibrate|Sequential|HShifter|Save|Reset|Close|Profile|Scale|Filter|Frequency|Select)\\b/i.test(text))`);
    assert.deepEqual(foreignLabels, []);
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({passed:true,window:win.getSize(),sequential:geometry,screens:6},null,2));
    console.log('Janela 1080x620, seis telas em portugues sem controles cortados, sequencial ampliado e perfis compativeis: aprovados.');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
