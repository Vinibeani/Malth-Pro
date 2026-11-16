const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('malthDesktop', Object.freeze({
  getCenterShortcut: () => ipcRenderer.invoke('shortcut:get'),
  captureCenterShortcut: (active) => ipcRenderer.invoke('shortcut:capture',active),
  setCenterShortcut: (value) => ipcRenderer.invoke('shortcut:set', value),
  triggerCenterShortcut: () => ipcRenderer.invoke('shortcut:trigger'),
  connectArduino: () => ipcRenderer.invoke('device:connect'),
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

    }
  }, true);
});
