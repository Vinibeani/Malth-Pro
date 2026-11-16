const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const profiles = [];
app.setPath('userData', path.join(root, 'firmware/build/standalone-ui-profile'));
app.disableHardwareAcceleration();
for (const name of ['shortcut:get', 'shortcut:set', 'shortcut:capture', 'device:connect', 'device:command']) {
  ipcMain.handle(name, () => null);
}
ipcMain.handle('device:send-profile', (_event, profile, options) => {
  profiles.push({ profile, options });
  return { sent: true, applied: true, persisted: options?.persist === true };
});

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, frame: false, width: 1080, height: 620,
    webPreferences: { preload: path.join(root, 'desktop/preload.cjs'), contextIsolation: true, sandbox: true } });
  const wait = () => new Promise(resolve => setTimeout(resolve, 150));
  try {
    await window.loadFile(path.join(root, 'malth-control/index.html'));
    window.webContents.send('device:state', { state: 'connected', ffbAuto: true });
    await wait();
    assert.equal(profiles.length, 0, 'Opening the app must preserve the board profile.');
    await window.webContents.executeJavaScript("document.querySelector('#saveProfile').click()");
    await wait();
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].options.persist, true);
    window.webContents.send('device:state', { state: 'disconnected' });
    window.webContents.send('device:state', { state: 'connected', ffbAuto: true });
    await wait();
    assert.equal(profiles.length, 1, 'Reconnecting must preserve the board profile.');
    console.log('Autonomous UI: connect/reconnect preserve the board profile; Save applies it.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    window.destroy();
    app.quit();
  }
});
