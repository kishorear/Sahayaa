/**
 * SupportAI Widget Application
 * Preload script for Electron
 */

const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Send messages to main process
  saveConfig: (config) => ipcRenderer.send('save-config', config),
  getConfig: () => ipcRenderer.send('get-config'),
  exportWidget: (type) => ipcRenderer.send('export-widget', type),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  
  // Async functions
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Receive messages from main process
  onConfigUpdate: (callback) => ipcRenderer.on('config-update', (_, data) => callback(data)),
  onExportSuccess: (callback) => ipcRenderer.on('export-success', (_, path) => callback(path)),
  onExportError: (callback) => ipcRenderer.on('export-error', (_, message) => callback(message)),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_, status) => callback(status)),
  onAction: (callback) => ipcRenderer.on('action', (_, action) => callback(action))
});
