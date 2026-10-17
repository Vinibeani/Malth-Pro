const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('malthDesktop', Object.freeze({
  connectArduino: () => ipcRenderer.invoke('device:connect'),
  disconnectArduino: () => ipcRenderer.invoke('device:disconnect'),
  sendProfile: (profile, options) => ipcRenderer.invoke('device:send-profile', profile, options),
  deviceCommand: (command) => ipcRenderer.invoke('device:command', command),
  onDeviceState: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('device:state', listener);
    return () => ipcRenderer.removeListener('device:state', listener);
  },
  onDeviceMessage: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('device:message', listener);
    return () => ipcRenderer.removeListener('device:message', listener);
  },
}));

window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('#minimizeWindow')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      ipcRenderer.send('window:minimize');
    } else if (target.closest('#closeWindow')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      ipcRenderer.send('window:close');
    } else if (target.closest('#connectButton')) {
      window.setTimeout(() => ipcRenderer.invoke('device:connect'), 0);
    }
  }, true);
});
