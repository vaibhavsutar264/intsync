const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');

let win = null;

function toggleWindowVisibility() {
  if (!win) return;
  if (win.isMinimized()) {
    win.restore();
    win.show();
  } else if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
  }
}

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 550;
  const windowHeight = 350;
  const x = Math.floor((screenWidth - windowWidth) / 2);
  const y = 0; // Absolute top of screen work area

  win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: false,          // Frameless window (required for transparent windows on Windows)
    alwaysOnTop: true,     // Keep window floating on top of code editors / Teams calls
    minimizable: false,    // Prevent OS/blur from auto-minimizing the window
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    // Set window title
    title: 'AI Interview Coach',
    autoHideMenuBar: true, // Hide the default file/edit menu bar for a cleaner premium look
    transparent: true,     // Make window transparent
    hasShadow: false,      // Prevent shadow borders
  });

  // Set always on top level to screen-saver to aggressively float over all active apps
  win.setAlwaysOnTop(true, 'screen-saver');

  // Enable native screen capture protection
  // Under the hood on Windows, this calls SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
  // Making the window invisible/transparent to Teams, Zoom, OBS, Slack, and Snipping Tool.
  win.setContentProtection(true);

  // Load the Vite local development server
  win.loadURL('http://localhost:5173');

  // Re-apply protection and lock minimization when showing or restoring to prevent state-clearing bugs in certain OS versions
  win.on('show', () => {
    win.setMinimizable(false);
    win.setContentProtection(true);
  });
  win.on('restore', () => {
    win.setMinimizable(false);
    win.setContentProtection(true);
  });
  
  // Optional: open dev tools for debugging during development
  // win.webContents.openDevTools();
}

// Listen for content resize requests from React
ipcMain.on('resize-window', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setContentSize(width, height, true);
  }
});

// Listen for minimize requests from React
ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setMinimizable(true);
    win.minimize();
  }
});

app.whenReady().then(() => {
  createWindow();

  // Register Alt+Escape global shortcut to toggle show/hide visibility
  globalShortcut.register('Alt+Escape', () => {
    toggleWindowVisibility();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  // Unregister all global shortcuts on exit
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
