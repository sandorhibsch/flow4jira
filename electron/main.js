const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { startNextServer } = require('./server');
const { initializeDatabase } = require('./db-setup');

let mainWindow;
let serverInstance;
const configPath = path.join(app.getPath('userData'), 'config.json');

function ensureConfig() {
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      jiraUrl: "",
      jiraEmail: "",
      jiraApiToken: ""
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }
}

async function createWindow() {
  // Initialize database before starting the server
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Continue anyway - might still work if db is partially set up
  }

  ensureConfig();
  if (!process.env.ELECTRON_START_URL) {
    console.log('Starting Next.js server...');
    try {
      serverInstance = await startNextServer(3000);
    } catch (error) {
      console.error('Failed to start Next.js server:', error);
      app.quit();
      return;
    }
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || "http://localhost:3000";
  console.log('Loading URL:', startUrl);
  mainWindow.loadURL(startUrl);
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (serverInstance) {
      serverInstance.close();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverInstance) {
    serverInstance.close();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
