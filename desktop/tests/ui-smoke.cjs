const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { encodeProfile } = require('../device-protocol.cjs');
const root = path.resolve(__dirname, '../..');
app.setPath('userData', path.join(root, 'firmware/build/ui-smoke-profile'));
app.disableHardwareAcceleration();
const commands = [], profiles = [];
ipcMain.handle('device:send-profile', (_event, profile, options) => {
  profiles.push(profile); return { sent: true, applied: true, persisted: options?.persist === true };
});
ipcMain.handle('device:command', (_event, command) => { commands.push(command); return { type: 'ack', cmd: command }; });
ipcMain.handle('device:connect', () => ({ connected: true }));
ipcMain.handle('device:disconnect', () => ({}));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, frame: false, width: 1080, height: 620, webPreferences: {
    preload: path.join(root, 'desktop/preload.cjs'), contextIsolation: true, nodeIntegration: false,
    sandbox: true, backgroundThrottling: false,
  } });
  try {
    await win.loadFile(path.join(root, 'malth-control/index.html'));
    await win.webContents.executeJavaScript('localStorage.clear()');
    await win.reload();
    await new Promise((resolve) => win.webContents.once('did-finish-load', resolve));
    win.webContents.setZoomFactor(1.2);
    win.webContents.send('device:state', { state: 'connected', detail: 'COM-teste' });
    // Canais opcionais com leituras altas/ruidosas, mesmo desabilitados.
    win.webContents.send('device:message', { type: 'state', raw: [258, 400, 900, 700, 128, 768], steering: 16384, gear: 2, armed: 0, centered: 1, overruns: 0 });
    await new Promise((resolve) => setTimeout(resolve, 180));
    const before = await win.webContents.executeJavaScript(`({
      connected: document.querySelector('#connectionStatus').textContent,
      gear: document.querySelector('#currentGear').textContent,
      meter: document.querySelector('[data-pedal-meter="accel"]').getAttribute('aria-valuenow'),
      min: document.querySelector('#steeringRange').min, max: document.querySelector('#steeringRange').max,
      manualForceButton: Boolean(document.querySelector('#toggleMotor')),
      wheel: document.querySelector('.wheel-illustration').style.transform,
    })`);
    assert.equal(before.connected, 'Conectado'); assert.equal(before.gear, '2'); assert.equal(before.meter, '25');
    assert.equal(before.min, '30'); assert.equal(before.max, '1080'); assert.equal(before.manualForceButton, false);
    assert(before.wheel.includes('135deg'));
    const optionalState = () => win.webContents.executeJavaScript(`['clutch', 'handbrake'].map((pedal) => ({
      fill: document.querySelector('[data-pedal-meter="' + pedal + '"] span').style.width,
      value: document.querySelector('[data-pedal-meter="' + pedal + '"]').getAttribute('aria-valuenow'),
      disabled: document.querySelector('[data-pedal-meter="' + pedal + '"]').getAttribute('aria-disabled'),
      captureDisabled: document.querySelector('[data-capture-pedal="' + pedal + '"]').disabled,
    }))`);
    const settleOptional = async (expected) => {
      const until = Date.now() + 4000;
      let actual;
      do {
        // A janela oculta pode reduzir o ritmo de renderizacao. Manter a
        // telemetria ativa como o Arduino e esperar o quadro em vez de 100 ms fixos.
        win.webContents.send('device:message', { type: 'state', raw: [258, 400, 900, 700, 128, 768], steering: 16384, gear: 2, armed: 0, centered: 1, overruns: 0 });
        await new Promise((resolve) => setTimeout(resolve, 50));
        actual = await optionalState();
        if (actual.every((pedal, i) => pedal.value === expected[i])) return actual;
      } while (Date.now() < until);
      assert.fail(`Medidores nao atualizaram: ${JSON.stringify(actual)}`);
    };
    for (const pedal of await optionalState()) {
      assert.equal(pedal.fill, '0%'); assert.equal(pedal.value, '0');
      assert.equal(pedal.disabled, 'true'); assert.equal(pedal.captureDisabled, true);
    }
    await win.webContents.executeJavaScript(`for (const key of ['enableClutchCfg', 'enableHandbrakeCfg']) {
      const input = document.querySelector('[data-setting="' + key + '"]');
      input.checked = true; input.dispatchEvent(new Event('input', {bubbles:true}));
    }`);
    const enabled = await settleOptional(['88', '68']);
    assert.equal(enabled[0].value, '88'); assert.equal(enabled[1].value, '68');
    assert(enabled.every((pedal) => pedal.disabled === 'false' && !pedal.captureDisabled));
    await win.webContents.executeJavaScript(`document.querySelector('#saveProfile').click()`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(encodeProfile(profiles.at(-1))[6], 15);
    await win.webContents.executeJavaScript(`for (const key of ['enableClutchCfg', 'enableHandbrakeCfg']) {
      const input = document.querySelector('[data-setting="' + key + '"]');
      input.checked = false; input.dispatchEvent(new Event('input', {bubbles:true}));
    }`);
    for (const pedal of await settleOptional(['0', '0'])) {
      assert.equal(pedal.fill, '0%'); assert.equal(pedal.value, '0');
      assert.equal(pedal.disabled, 'true'); assert.equal(pedal.captureDisabled, true);
    }
    const pedalPopup = await win.webContents.executeJavaScript(`(() => {
      const toast = document.querySelector('#toast'); toast.classList.remove('is-visible'); toast.textContent = '';
      document.querySelector('[data-capture-pedal="accel"][data-endpoint="min"]').click();
      document.querySelector('[data-capture-pedal="accel"][data-endpoint="max"]').click();
      return toast.classList.contains('is-visible') || toast.textContent !== '';
    })()`);
    assert.equal(pedalPopup, false);
    await win.webContents.executeJavaScript(`document.querySelector('#saveProfile').click();`);
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert(Math.abs(profiles.at(-1).pedalCalibration.accel.min - 258 / 1023 * 100) < 0.1);
    assert.equal(await win.webContents.executeJavaScript(`document.querySelector('#saveState').textContent`), 'Salvo');
    assert.equal(encodeProfile(profiles.at(-1))[6], 3);
    await win.webContents.executeJavaScript(`document.querySelector('#centerButton').click(); document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}));`);
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.deepEqual(commands, ['CENTER', 'DISARM']);
    fs.writeFileSync(path.join(root, 'firmware/build/ui-smoke-result.json'), JSON.stringify({ passed: true, optionalPedals: 'disabled-zero / enabled-live / disabled-zero', state: before }, null, 2));
    console.log('Interface Electron: pedais opcionais desabilitados zerados; habilitados com leitura real; mascara enviada ao firmware correta. Calibracao, conexao e comandos aprovados.');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
