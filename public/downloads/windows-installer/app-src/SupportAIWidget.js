/**
 * SupportAI Widget Application
 * Main Electron application file
 */

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const url = require('url');

// Configuration
let mainWindow;
let tray;
let isQuitting = false;
let config = {
  tenantId: '',
  apiKey: '',
  primaryColor: '#6366F1',
  position: 'right',
  autoOpen: false,
  branding: true
};

// Load configuration from file
function loadConfig() {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const savedConfig = JSON.parse(data);
      config = { ...config, ...savedConfig };
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
}

// Save configuration to file
function saveConfig() {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
}

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: 'SupportAI Widget Manager',
    icon: path.join(__dirname, 'icons', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Send configuration to renderer when ready
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('config-update', config);
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

// Create the system tray icon
function createTray() {
  tray = new Tray(path.join(__dirname, 'icons', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open SupportAI Widget Manager', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Generate Widget Code', click: () => mainWindow.webContents.send('action', 'generate-code') },
    { label: 'Open Dashboard', click: () => shell.openExternal('https://supportai.com/dashboard') },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
  ]);
  
  tray.setToolTip('SupportAI Widget');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// Initialize the application
app.whenReady().then(() => {
  loadConfig();
  createWindow();
  createTray();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Handle application quit
app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Communication
ipcMain.on('save-config', (event, newConfig) => {
  config = { ...config, ...newConfig };
  saveConfig();
  event.reply('config-update', config);
});

ipcMain.on('get-config', (event) => {
  event.reply('config-update', config);
});

ipcMain.on('export-widget', (event, type) => {
  let content = '';
  
  // Generate the export content based on the type
  if (type === 'html') {
    content = `<!-- SupportAI Chat Widget -->
<script>
  window.supportAiConfig = {
    tenantId: ${config.tenantId},
    apiKey: "${config.apiKey}",
    primaryColor: "${config.primaryColor}",
    position: "${config.position}",
    autoOpen: ${config.autoOpen},
    branding: ${config.branding},
    reportData: true
  };
</script>
<script src="https://supportai.com/widget.js" async></script>`;
  } else if (type === 'js') {
    content = `// SupportAI Widget Integration
const script = document.createElement('script');
script.src = 'https://supportai.com/widget.js';
script.async = true;

const configScript = document.createElement('script');
configScript.textContent = \`
  window.supportAiConfig = {
    tenantId: ${config.tenantId},
    apiKey: "${config.apiKey}",
    primaryColor: "${config.primaryColor}",
    position: "${config.position}",
    autoOpen: ${config.autoOpen},
    branding: ${config.branding},
    reportData: true
  };
\`;

document.head.appendChild(configScript);
document.body.appendChild(script);`;
  }
  
  // Show save dialog
  dialog.showSaveDialog({
    title: 'Export Widget Code',
    defaultPath: type === 'html' ? 'supportai-widget.html' : 'supportai-widget.js',
    filters: [
      { name: type === 'html' ? 'HTML Files' : 'JavaScript Files', extensions: [type] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content);
      mainWindow.webContents.send('export-success', result.filePath);
    }
  }).catch(err => {
    console.error('Error exporting widget:', err);
    mainWindow.webContents.send('export-error', err.message);
  });
});

ipcMain.on('check-for-updates', async (event) => {
  // Placeholder for update checking logic
  event.reply('update-status', { available: false, version: app.getVersion() });
});

// Expose some functions to the renderer process
ipcMain.handle('open-external', async (event, url) => {
  return shell.openExternal(url);
});
