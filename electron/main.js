'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// Headless software-rendering path, used only for the automated smoke test.
if (process.env.CHEMBODY_SMOKE === '1') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('ozone-platform', 'headless');
  app.commandLine.appendSwitch('use-gl', 'angle');
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
  app.commandLine.appendSwitch('in-process-gpu');
  app.disableHardwareAcceleration();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0b1020',
    title: 'ChemBody Explorer',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  win.once('ready-to-show', () => win.show());

  // Open external links (reference sources) in the system browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev && process.env.CHEMBODY_DEVTOOLS === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // Smoke test: boot, report renderer console errors, then exit.
  if (process.env.CHEMBODY_SMOKE === '1') {
    let failed = false;
    win.webContents.on('console-message', (_e, level, message) => {
      const tag = level >= 2 ? 'ERROR' : 'LOG';
      if (level >= 2) failed = true;
      console.log(`[renderer ${tag}] ${message}`);
    });
    win.webContents.on('render-process-gone', (_e, details) => {
      console.log(`[render-process-gone] ${JSON.stringify(details)}`);
      failed = true;
    });
    win.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        win.webContents
          .executeJavaScript(
            'JSON.stringify({ libs: document.getElementById("libCount").textContent, canvas: !!document.querySelector("#viewport canvas") })'
          )
          .then((r) => console.log('[smoke] dom-probe ' + r))
          .catch((e) => { console.log('[smoke] probe-error ' + e.message); failed = true; })
          .finally(() => { console.log('[smoke] done failed=' + failed); app.exit(failed ? 1 : 0); });
      }, 3500);
    });
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
