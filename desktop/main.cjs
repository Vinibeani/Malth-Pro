const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { SerialPort } = require('serialport');
const { DeviceLink } = require('./device-link.cjs');
const { MotorSession } = require('./motor-session.cjs');
const { deviceErrorMessage } = require('./device-protocol.cjs');

const PRODUCT_NAME = 'Malth Pro';
const BAUD_RATE = 115200;

let mainWindow;
let devicePort;
let deviceLink;
let motorSession;
let connecting = false;
let autoConnectPaused = false;
let reconnectTimer;
let forceStopped = false;

function rememberDevice(port) {
  try {
    const directory = app.getPath('userData');
    fs.mkdirSync(directory, { recursive: true });
    const identity = Object.fromEntries(['path', 'serialNumber', 'pnpId', 'vendorId', 'productId']
      .map((key) => [key, port[key] || '']));
    fs.writeFileSync(path.join(directory, 'last-device.json'), JSON.stringify(identity), 'utf8');
  } catch { /* Uma preferencia indisponivel nao invalida a conexao USB. */ }
}

function rememberedDeviceIndex(ports) {
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'last-device.json'), 'utf8'));
    const normalized = (value) => String(value || '').toLowerCase();
    return ports.findIndex((port) => {
      if (!saved.vendorId || !saved.productId || normalized(port.vendorId) !== normalized(saved.vendorId) ||
          normalized(port.productId) !== normalized(saved.productId)) return false;
      if (saved.serialNumber) return port.serialNumber === saved.serialNumber;
      return Boolean(saved.pnpId) && port.path === saved.path && port.pnpId === saved.pnpId;
    });
  } catch { return -1; }
}

function publishDeviceState(state, detail = '') {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('device:state', { state, detail });
}

function publishDeviceMessage(message) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('device:message', message);
}

function closeDevice() {
  autoConnectPaused = true;
  deviceLink?.close();
  deviceLink = undefined;
  motorSession = undefined;
  if (!devicePort) return Promise.resolve();
  const port = devicePort;
  devicePort = undefined;
  return new Promise((resolve) => {
    if (!port.isOpen) {
      resolve();
      return;
    }
    port.close(() => resolve());
  });
}

async function selectAndConnectDevice({ automatic = false } = {}) {
  if (automatic && autoConnectPaused) return { connected: false };
  if (!automatic) autoConnectPaused = false;
  if (deviceLink?.connected) return { connected: true, path: devicePort.path };
  if (connecting) return { connected: false, pending: true };
  connecting = true;
  try {

  const ports = await SerialPort.list();
  if (!ports.length) {
    if (automatic) return { connected: false };
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: PRODUCT_NAME,
      message: 'Nenhuma porta USB serial foi encontrada.',
      detail: 'Conecte o Arduino Leonardo e tente novamente.',
      buttons: ['OK'],
    });
    return { connected: false };
  }

  let selected = automatic ? rememberedDeviceIndex(ports) : -1;
  if (automatic && selected < 0) return { connected: false };
  if (!automatic) {
  const choices = ports.map((port) => {
    const identity = [port.manufacturer, port.pnpId].filter(Boolean).join(' · ');
    return identity ? `${port.path} — ${identity}` : port.path;
  });
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: `${PRODUCT_NAME} · USB`,
    message: 'Selecione a porta do Arduino Leonardo:',
    buttons: [...choices, 'Cancelar'],
    cancelId: choices.length,
    defaultId: 0,
    noLink: true,
  });
  if (result.response >= choices.length) return { connected: false };
  selected = result.response;
  }

  const port = new SerialPort({ path: ports[selected].path, baudRate: BAUD_RATE, autoOpen: false });
  devicePort = port;
  const link = new DeviceLink(port, publishDeviceMessage, (error) => {
    if (deviceLink !== link) return;
    devicePort = undefined; deviceLink = undefined; motorSession = undefined;
    publishDeviceState('disconnected', error.message);
  });
  deviceLink = link;
  motorSession = new MotorSession(link);
  motorSession.forceRequested = !forceStopped;
  await new Promise((resolve, reject) => {
    port.open((error) => {
      if (error) reject(error); else port.set({ dtr: true }, (setError) => setError ? reject(setError) : resolve());
    });
  });
  const hello = await link.handshake();
  rememberDevice(ports[selected]);
  publishDeviceState('connected', `${port.path} · programa ${hello.firmware}`);
  return { connected: true, path: port.path, firmware: hello.firmware };
  } catch (error) {
    deviceLink?.close(); deviceLink = undefined; devicePort = undefined; motorSession = undefined;
    const message = deviceErrorMessage(error);
    if (!automatic) publishDeviceState('error', message);
    return { connected: false, error: message };
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
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, destination) => {
    if (!destination.startsWith('file://')) event.preventDefault();
  });

  const entry = app.isPackaged
    ? path.join(process.resourcesPath, 'ui', 'index.html')
    : path.resolve(__dirname, '..', 'malth-control', 'index.html');
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1.2);
    selectAndConnectDevice({ automatic: true });
    clearInterval(reconnectTimer);
    reconnectTimer = setInterval(() => {
      if (!deviceLink?.connected && !connecting && !autoConnectPaused) selectAndConnectDevice({ automatic: true });
    }, 2000);
  });
  mainWindow.loadFile(entry);
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('device:connect', () => selectAndConnectDevice());
ipcMain.handle('device:disconnect', closeDevice);
ipcMain.handle('device:send-profile', (_event, profile, options) => sendProfileToDevice(profile, options));
ipcMain.handle('device:command', (_event, command) => {
  if (!['CENTER', 'ARM', 'DISARM'].includes(command)) throw new TypeError('Comando inválido.');
  if (!deviceLink?.connected) throw new Error('Conecte o Arduino primeiro.');
  forceStopped = command === 'DISARM';
  return motorSession.command(command);
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.malthpro.desktop');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  clearInterval(reconnectTimer);
  deviceLink?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
