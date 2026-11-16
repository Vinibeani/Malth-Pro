const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { HidPort } = require('./hid-port.cjs');
const { DeviceLink } = require('./device-link.cjs');
const { MotorSession } = require('./motor-session.cjs');
const { deviceErrorMessage } = require('./device-protocol.cjs');
const { automaticCandidates } = require('./connection-selection.cjs');
const { createConnectionLog } = require('./connection-log.cjs');

const { CenterShortcut } = require('./center-shortcut.cjs');
let centerShortcut;
const PRODUCT_NAME = 'Malth Pro';

let mainWindow;
let devicePort;
let deviceLink;
let motorSession;
let connecting = false;
const retryAfter = new Map();
let reconnectTimer;
let connectionLog;
let lastFailure;

function logConnection(event, detail) {
  connectionLog ||= createConnectionLog(app.getPath('userData'));
  connectionLog(event, detail);
}


function rememberDevice(port) {
  try {
    const directory = app.getPath('userData');
    fs.mkdirSync(directory, { recursive: true });
    const identity = Object.fromEntries(['path', 'serialNumber', 'pnpId', 'vendorId', 'productId']
      .map((key) => [key, port[key] || '']));
    fs.writeFileSync(path.join(directory, 'last-device.json'), JSON.stringify(identity), 'utf8');
  } catch { /* Uma preferencia indisponivel nao invalida a conexao USB. */ }
}

function rememberedDevice() {
  try { return JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'last-device.json'), 'utf8')); }
  catch { return null; }
}

function publishDeviceState(state, detail = '') {
  if (detail && ['disconnected', 'error'].includes(state)) lastFailure = detail;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('device:state', { state, detail, lastFailure, ffbAuto: deviceLink?.ffbAuto === true });
}

function publishDeviceMessage(message) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('device:message', message);
}

async function selectAndConnectDevice() {
  if (deviceLink?.connected) return { connected: true, path: devicePort.path };
  if (connecting) return { connected: false, pending: true };
  connecting = true;
  try {
    const ports = automaticCandidates(await HidPort.list(), rememberedDevice());
    const present = new Set(ports.map((port) => port.path));
    for (const candidate of retryAfter.keys()) if (!present.has(candidate)) retryAfter.delete(candidate);
    for (const candidate of ports) {
      if ((retryAfter.get(candidate.path) || 0) > Date.now()) continue;
      publishDeviceState('connecting', 'Reconhecendo o Malth Proâ€¦');
      logConnection('opening', { path: candidate.path });
      const port = new HidPort({ path: candidate.path });
      const link = new DeviceLink(port, publishDeviceMessage, (error) => {
        if (deviceLink !== link) return;
        devicePort = undefined; deviceLink = undefined; motorSession = undefined;
        logConnection('lost', { path: port.path, operation: error.operation, code: error.code,
          command: error.command, message: error.message, original: error.cause?.message });
        publishDeviceState('disconnected', error.message);
      });
      devicePort = port; deviceLink = link;
      try {
        await new Promise((resolve, reject) => port.open((error) => {
          if (error) reject(error);
          else resolve();
        }));
        const hello = await link.handshake();
        // No profile, CENTER or ARM reaches a device before its protocol is verified.
        motorSession = new MotorSession(link);
        retryAfter.delete(candidate.path);
        rememberDevice(candidate);
        logConnection('connected', { path: port.path, firmware: hello.firmware });
        publishDeviceState('connected', `${port.path} Â· programa ${hello.firmware}`);
        return { connected: true, path: port.path, firmware: hello.firmware };
      } catch (error) {
        logConnection('connect-failed', { path: candidate.path, operation: error.operation || 'open',
          code: error.code, message: error.message, original: error.cause?.message });
        link.fail(error, error.operation || 'open');
        if (deviceLink === link) { devicePort = undefined; deviceLink = undefined; motorSession = undefined; }
        retryAfter.set(candidate.path, Date.now() + 15000);
        publishDeviceState('error', deviceErrorMessage(error));
      }
    }
    return { connected: false };
  } catch (error) {
    logConnection('enumeration-failed', { operation: 'enumerate', code: error.code, message: error.message });
    publishDeviceState('error', deviceErrorMessage(error));
    return { connected: false, error: deviceErrorMessage(error) };
  } finally { connecting = false; }
}

function sendProfileToDevice(profile, options = {}) {
  if (!deviceLink?.connected) return { sent: false, reason: 'disconnected' };
  return motorSession.sendProfile(profile, options.persist === true);
}

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'ui', 'assets', 'malth-pro-m-512.png')
    : path.resolve(__dirname, '..', 'malth-control', 'assets', 'malth-pro-m-512.png');
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 620,
    minWidth: 1080,
    minHeight: 620,
    resizable: false,
    maximizable: false,
    title: PRODUCT_NAME,
    backgroundColor: '#17191a',
    frame: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, destination) => {
    if (!destination.startsWith('file://')) event.preventDefault();
  });

  const entry = app.isPackaged
    ? path.join(process.resourcesPath, 'ui', 'index.html')
    : path.resolve(__dirname, '..', 'malth-control', 'index.html');
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1.2);
    selectAndConnectDevice();
    clearInterval(reconnectTimer);
    reconnectTimer = setInterval(() => {
      if (!deviceLink?.connected && !connecting) selectAndConnectDevice();
    }, 2000);
  });
  mainWindow.loadFile(entry);
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

ipcMain.handle('shortcut:get', () => centerShortcut?.value || null);
ipcMain.handle('shortcut:set', (_e,value) => { globalShortcut.setSuspended(false); return centerShortcut.set(value); });
ipcMain.handle('shortcut:capture', (_e,active) => globalShortcut.setSuspended(active===true));
ipcMain.handle('shortcut:trigger', () => { if(centerShortcut?.value?.type==='gamepad')centerShortcut.fire(); });
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('device:connect', () => selectAndConnectDevice());
ipcMain.handle('device:send-profile', (_event, profile, options) => sendProfileToDevice(profile, options));
ipcMain.handle('device:command', (_event, command) => {
  if (!['CENTER', 'ARM', 'DISARM'].includes(command)) throw new TypeError('Comando invÃ¡lido.');
  if (!deviceLink?.connected) throw new Error('Conecte o Arduino primeiro.');
  return motorSession.command(command);
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});
app.whenReady().then(() => {
  app.setAppUserModelId('com.malthpro.desktop');
  centerShortcut = new CenterShortcut(globalShortcut, path.join(app.getPath('userData'),'center-shortcut.json'), async () => {
    if(!deviceLink?.connected)throw Error('Volante desconectado.');
    await motorSession.command('CENTER');
  });
  centerShortcut.load();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
}

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  clearInterval(reconnectTimer);
  deviceLink?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
