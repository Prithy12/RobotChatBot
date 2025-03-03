const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const keytar = require('keytar');
const { setupRobotHandlers } = require('./preload-bridge');

// Logging system setup
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

const LOG_FILE_PATH = path.join(app.getPath('userData'), 'robot-debug.log');
const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
let logStream = null;

// Set up data persistence with a secure random encryption key
// Generate a per-installation random key or use existing one
let store;
const crypto = require('crypto');

// Function to generate a secure random key (32 chars with mixed character types)
function generateSecureKey() {
  // Create a set of characters to choose from (uppercase, lowercase, numbers, special chars)
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let key = '';
  
  // Generate 32 random bytes and map them to our charset
  const randomBytes = crypto.randomBytes(32);
  for (let i = 0; i < 32; i++) {
    // Use modulo to map the byte to a character in our charset
    const index = randomBytes[i] % charset.length;
    key += charset[index];
  }
  
  return key;
}

// Function to get or create an encryption key
function getEncryptionKey() {
  const keyPath = path.join(app.getPath('userData'), '.encryption-key');
  
  // Check if key file exists
  if (fs.existsSync(keyPath)) {
    try {
      // Read existing key
      return fs.readFileSync(keyPath, 'utf8').trim();
    } catch (error) {
      console.error('Error reading encryption key:', error.message);
      // If we can't read the key, generate a new one
    }
  }
  
  // Generate a new key
  const newKey = generateSecureKey();
  
  // Save the key to file
  try {
    fs.writeFileSync(keyPath, newKey, { mode: 0o600 }); // Restrict permissions
    console.log('Generated and saved new encryption key');
    return newKey;
  } catch (error) {
    console.error('Error saving encryption key:', error.message);
    // If we can't save the key, return it anyway for this session
    return newKey;
  }
}

try {
  // Get an encryption key
  const encryptionKey = getEncryptionKey();
  
  // Try to initialize the store
  store = new Store({
    encryptionKey: encryptionKey,
    clearInvalidConfig: true // Add this to clear invalid configurations
  });
  console.log('Store initialized successfully');
} catch (error) {
  console.error('Error initializing store:', error.message);
  
  // Get the store file path
  const { app } = require('electron');
  const path = require('path');
  const fs = require('fs');
  
  const configPath = path.join(app.getPath('userData'), 'config.json');
  console.log(`Checking for config file at: ${configPath}`);
  
  // Check if the file exists and try to delete it
  if (fs.existsSync(configPath)) {
    try {
      // Create a backup
      fs.copyFileSync(configPath, `${configPath}.backup`);
      console.log(`Backup created at: ${configPath}.backup`);
      
      // Delete the corrupted file
      fs.unlinkSync(configPath);
      console.log(`Deleted corrupted config file: ${configPath}`);
      
      // Initialize a new store with a fresh encryption key
      const encryptionKey = generateSecureKey();
      store = new Store({
        encryptionKey: encryptionKey
      });
      
      // Save the new key
      const keyPath = path.join(app.getPath('userData'), '.encryption-key');
      fs.writeFileSync(keyPath, encryptionKey, { mode: 0o600 });
      
      console.log('Created new store after deleting corrupted file');
    } catch (deleteError) {
      console.error('Failed to delete corrupted config:', deleteError.message);
      
      // As a last resort, create an in-memory store
      store = {
        get: (key, defaultValue) => defaultValue,
        set: () => {},
        has: () => false,
        delete: () => {},
        clear: () => {},
        size: 0
      };
      console.log('Using in-memory store fallback');
    }
  } else {
    console.log('No config file found. Creating new store');
    // Generate a new encryption key
    const encryptionKey = generateSecureKey();
    store = new Store({
      encryptionKey: encryptionKey
    });
    
    // Save the new key
    const keyPath = path.join(app.getPath('userData'), '.encryption-key');
    try {
      fs.writeFileSync(keyPath, encryptionKey, { mode: 0o600 });
    } catch (keyError) {
      console.error('Failed to save encryption key:', keyError.message);
    }
  }
}

// Constants
const SERVICE_NAME = 'claude-desktop';
const ACCOUNT_NAME = 'claude-api-key';
const isDev = process.argv.includes('--dev');

// Default configuration
const DEFAULT_CONFIG = {
  model: 'claude-3-haiku-20240307',
  maxTokens: 1024,
  maxHistoryLength: 100,
  systemPrompt: 'You are Claude, an AI assistant by Anthropic.',
  temperature: 0.7,
  theme: 'dark',
  fontSize: 'medium'
};

// Platform detection
const PLATFORM = {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isWSL: process.platform === 'linux' && os.release().toLowerCase().includes('microsoft')
};

// Global reference to main window
let mainWindow;

/**
 * Logging system implementation
 * Writes to log file with proper formatting and rotation
 */

// Initialize logging system
function initLogging() {
  try {
    // Check if log file exists and exceeds max size
    if (fs.existsSync(LOG_FILE_PATH)) {
      const stats = fs.statSync(LOG_FILE_PATH);
      
      if (stats.size > MAX_LOG_SIZE_BYTES) {
        // Rotate log file - rename current to .old and create new
        const oldLogPath = `${LOG_FILE_PATH}.old`;
        if (fs.existsSync(oldLogPath)) {
          fs.unlinkSync(oldLogPath);
        }
        fs.renameSync(LOG_FILE_PATH, oldLogPath);
      }
    }
    
    // Ensure log directory exists
    const logDir = path.dirname(LOG_FILE_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Open write stream in append mode
    logStream = fs.createWriteStream(LOG_FILE_PATH, { flags: 'a' });
    
    // Log startup information
    logToFile(LOG_LEVELS.INFO, `====== Application Started v${app.getVersion()} ======`);
    logToFile(LOG_LEVELS.INFO, `Platform: ${process.platform}, Electron: ${process.versions.electron}`);
    logToFile(LOG_LEVELS.INFO, `Chromium: ${process.versions.chrome}, Node: ${process.versions.node}`);
    logToFile(LOG_LEVELS.INFO, `User data path: ${app.getPath('userData')}`);
    
    // Override console methods to also log to file
    overrideConsoleWithFileLogging();
    
    return true;
  } catch (error) {
    console.error(`Failed to initialize logging system: ${error.message}`);
    return false;
  }
}

// Format and write log message to file
function logToFile(level, message, data = null) {
  if (!logStream) return false;
  
  try {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    let formattedMessage = `[${timestamp}] [${level}] [PID:${pid}] ${message}`;
    
    // Add data if provided
    if (data) {
      let dataStr;
      if (data instanceof Error) {
        dataStr = `\n    Error: ${data.message}\n    Stack: ${data.stack || 'No stack trace'}`;
      } else if (typeof data === 'object') {
        try {
          dataStr = `\n    ${JSON.stringify(data, null, 4).replace(/\n/g, '\n    ')}`;
        } catch (e) {
          dataStr = `\n    [Object] ${Object.prototype.toString.call(data)}`;
        }
      } else {
        dataStr = `\n    ${data}`;
      }
      formattedMessage += dataStr;
    }
    
    // Add newline and write to stream
    formattedMessage += '\n';
    logStream.write(formattedMessage);
    
    return true;
  } catch (error) {
    console.error(`Failed to write to log file: ${error.message}`);
    return false;
  }
}

// Override console methods to log to file as well
function overrideConsoleWithFileLogging() {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
  
  // Override with versions that also log to file
  console.log = function(...args) {
    const message = args.join(' ');
    logToFile(LOG_LEVELS.INFO, message);
    originalConsole.log.apply(console, args);
  };
  
  console.info = function(...args) {
    const message = args.join(' ');
    logToFile(LOG_LEVELS.INFO, message);
    originalConsole.info.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    logToFile(LOG_LEVELS.WARN, message);
    originalConsole.warn.apply(console, args);
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    // Extract Error object if present
    const errorObj = args.find(arg => arg instanceof Error);
    logToFile(LOG_LEVELS.ERROR, message, errorObj);
    originalConsole.error.apply(console, args);
  };
  
  console.debug = function(...args) {
    const message = args.join(' ');
    logToFile(LOG_LEVELS.DEBUG, message);
    originalConsole.debug.apply(console, args);
  };
}

// Close log stream properly
function closeLogging() {
  if (logStream) {
    logToFile(LOG_LEVELS.INFO, '====== Application Closed ======');
    logStream.end();
    logStream = null;
  }
}

// Create the main application window
function createMainWindow() {
  // Log window creation
  logToFile(LOG_LEVELS.INFO, 'Creating main application window');
  
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../dist/preload.bundle.js'),
      devTools: isDev, // Only enable DevTools in development mode
      additionalArguments: [`--app-path=${__dirname}`], // Pass the app path to preload
      sandbox: false, // Disable sandbox to allow importing local modules
    },
    icon: path.join(__dirname, '../assets/icons/png/64x64.png'),
    show: false,
    backgroundColor: '#1A1C23', // Match dark theme background
    titleBarStyle: 'hiddenInset',
    frame: false,
    transparent: false
  });

  // Set proper CSP headers including frame-ancestors
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src https://api.anthropic.com; img-src 'self' data:; media-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
        ]
      }
    });
  });

  // Load the main HTML file
  logToFile(LOG_LEVELS.DEBUG, `Loading index.html from ${path.join(__dirname, 'index.html')}`);
  win.loadFile(path.join(__dirname, 'index.html'));

  // Only open DevTools automatically in development mode
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
    logToFile(LOG_LEVELS.INFO, 'DevTools opened automatically for debugging in dev mode');
  }

  // Show window once it's ready to prevent flickering
  win.once('ready-to-show', () => {
    logToFile(LOG_LEVELS.INFO, 'Main window ready to show');
    win.show();
    
    // Check for updates if not in dev mode
    if (!isDev) {
      logToFile(LOG_LEVELS.INFO, 'Checking for application updates');
      autoUpdater.checkForUpdatesAndNotify();
    }
    
    // Log app data paths
    logToFile(LOG_LEVELS.DEBUG, `App paths: 
      - Home: ${app.getPath('home')}
      - AppData: ${app.getPath('appData')}
      - UserData: ${app.getPath('userData')}
      - Temp: ${app.getPath('temp')}
      - Exe: ${app.getPath('exe')}
      - Desktop: ${app.getPath('desktop')}
      - Documents: ${app.getPath('documents')}
    `);
  });

  // Log window events
  win.on('focus', () => logToFile(LOG_LEVELS.DEBUG, 'Window focused'));
  win.on('blur', () => logToFile(LOG_LEVELS.DEBUG, 'Window blurred'));
  win.on('maximize', () => logToFile(LOG_LEVELS.DEBUG, 'Window maximized'));
  win.on('unmaximize', () => logToFile(LOG_LEVELS.DEBUG, 'Window unmaximized'));
  win.on('minimize', () => logToFile(LOG_LEVELS.DEBUG, 'Window minimized'));
  win.on('restore', () => logToFile(LOG_LEVELS.DEBUG, 'Window restored'));
  win.on('close', () => logToFile(LOG_LEVELS.INFO, 'Window closing'));
  
  // Log content loading events
  win.webContents.on('did-start-loading', () => {
    logToFile(LOG_LEVELS.DEBUG, 'Webcontents: started loading');
  });
  
  win.webContents.on('did-finish-load', () => {
    logToFile(LOG_LEVELS.INFO, 'Webcontents: finished loading');
  });
  
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logToFile(LOG_LEVELS.ERROR, `Webcontents: failed to load - ${errorDescription} (${errorCode})`);
  });
  
  win.webContents.on('crashed', (event, killed) => {
    logToFile(LOG_LEVELS.CRITICAL, `Webcontents: crashed - killed: ${killed}`);
  });
  
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const CONSOLE_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
    const consoleLevel = CONSOLE_LEVELS[level] || 'INFO';
    logToFile(LOG_LEVELS[consoleLevel], `Renderer: ${message} (${sourceId}:${line})`);
  });

  // Initialize message history from storage
  const history = store.get('messageHistory', []);
  logToFile(LOG_LEVELS.DEBUG, `Loaded message history with ${history.length} messages`);
  
  // Create and set the application menu
  const appMenu = createAppMenu();
  Menu.setApplicationMenu(appMenu);
  logToFile(LOG_LEVELS.INFO, 'Application menu set successfully');

  // Focus the window
  win.focus();
  
  return win;
}

// Create the application menu
function createAppMenu() {
  logToFile(LOG_LEVELS.INFO, 'Creating application menu');
  
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Clear Chat History',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: Clear Chat History clicked');
            mainWindow.webContents.send('clear-history');
          }
        },
        {
          label: 'Export Chat History',
          click: async () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: Export Chat History clicked');
            const { filePath } = await dialog.showSaveDialog({
              title: 'Export Chat History',
              defaultPath: path.join(app.getPath('documents'), 'claude-chat-history.json'),
              filters: [
                { name: 'JSON Files', extensions: ['json'] }
              ]
            });
            
            if (filePath) {
              logToFile(LOG_LEVELS.INFO, `Exporting history to ${filePath}`);
              const history = store.get('messageHistory', []);
              fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
              logToFile(LOG_LEVELS.INFO, `Exported ${history.length} messages to file`);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'API Key',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: API Key settings clicked');
            mainWindow.webContents.send('open-settings');
          }
        },
        {
          label: 'Configuration',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: Configuration settings clicked');
            mainWindow.webContents.send('open-config');
          }
        }
      ]
    },
    // Only show debug menu in development mode
    ...(isDev ? [{
      label: 'Debug',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: Toggle DevTools clicked');
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        {
          label: 'View Log File',
          click: async () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: View Log File clicked');
            if (fs.existsSync(LOG_FILE_PATH)) {
              logToFile(LOG_LEVELS.INFO, `Opening log file: ${LOG_FILE_PATH}`);
              shell.openPath(LOG_FILE_PATH);
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'Log File Not Found',
                message: 'No log file exists yet.',
                detail: `Expected location: ${LOG_FILE_PATH}`
              });
            }
          }
        },
        {
          label: 'Open Log Directory',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: Open Log Directory clicked');
            const logDir = path.dirname(LOG_FILE_PATH);
            shell.openPath(logDir);
          }
        },
        { type: 'separator' },
        {
          label: 'Log Robot Information',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: Log Robot Information clicked');
            mainWindow.webContents.send('log-robot-diagnostics');
          }
        },
        {
          label: 'Robot Diagnostic Mode',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            logToFile(LOG_LEVELS.INFO, `Menu: Robot Diagnostic Mode ${menuItem.checked ? 'enabled' : 'disabled'}`);
            mainWindow.webContents.send('toggle-robot-diagnostics', menuItem.checked);
          }
        },
        { type: 'separator' },
        {
          label: 'Clear Log File',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: Clear Log File clicked');
            
            dialog.showMessageBox(mainWindow, {
              type: 'question',
              buttons: ['Yes', 'No'],
              title: 'Confirm Log Clear',
              message: 'Are you sure you want to clear the log file?'
            }).then(result => {
              if (result.response === 0) { // Yes
                // Close current log stream
                if (logStream) {
                  logStream.end();
                  logStream = null;
                }
                
                // Create new empty log file
                fs.writeFileSync(LOG_FILE_PATH, '');
                
                // Reinitialize logging
                logStream = fs.createWriteStream(LOG_FILE_PATH, { flags: 'a' });
                logToFile(LOG_LEVELS.INFO, '====== Log Cleared and Restarted ======');
                
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Log Cleared',
                  message: 'The log file has been cleared successfully.'
                });
              }
            });
          }
        }
      ]
    }] : []),
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: About clicked');
            dialog.showMessageBox(mainWindow, {
              title: 'About Claude Desktop',
              message: `Claude Desktop v${app.getVersion()}`,
              detail: 'A desktop application for chatting with Claude AI.\n\nPowered by Anthropic\'s Claude API.',
              icon: path.join(__dirname, '../assets/icons/png/64x64.png')
            });
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            logToFile(LOG_LEVELS.INFO, 'Menu: Check for Updates clicked');
            autoUpdater.checkForUpdatesAndNotify();
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  logToFile(LOG_LEVELS.DEBUG, `Menu build complete with ${template.length} top-level items`);
  return menu;
}

/**
 * API key storage with fallback mechanisms
 * 
 * Uses a tiered approach:
 * 1. System keychain via keytar (most secure)
 * 2. Encrypted local storage via electron-store (fallback)
 */

// Get API key with fallback mechanisms
async function getApiKeySecure() {
  // First try system keychain
  try {
    const apiKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    if (apiKey) return { key: apiKey, source: 'keychain' };
  } catch (error) {
    console.log(`Keychain access failed: ${error.message}`);
    // Don't return error as we'll try fallback
  }

  // Fallback to encrypted store
  try {
    const apiKey = store.get('apiKey');
    if (apiKey) return { key: apiKey, source: 'store' };
  } catch (error) {
    console.error(`Store access failed: ${error.message}`);
  }

  return { key: null, source: null };
}

// Save API key with fallback mechanisms
async function saveApiKeySecure(apiKey) {
  let keychainSuccess = false;
  let storeSuccess = false;
  let errorMsg = '';

  // Try system keychain first
  try {
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
    keychainSuccess = true;
  } catch (error) {
    errorMsg = `${error.message}`;
    console.error(`Keychain save failed: ${error.message}`);
    // Continue to fallback
  }

  // Always save to encrypted store as fallback
  try {
    store.set('apiKey', apiKey);
    storeSuccess = true;
  } catch (error) {
    errorMsg += ` Store error: ${error.message}`;
    console.error(`Store save failed: ${error.message}`);
  }

  return { 
    success: keychainSuccess || storeSuccess,
    keychainWorked: keychainSuccess,
    storeWorked: storeSuccess,
    error: errorMsg
  };
}

// Handle IPC messages from renderer process
ipcMain.handle('get-api-key', async () => {
  try {
    const result = await getApiKeySecure();
    return result.key;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
});

ipcMain.handle('save-api-key', async (_, apiKey) => {
  try {
    const result = await saveApiKeySecure(apiKey);
    return result;
  } catch (error) {
    console.error('Error saving API key:', error);
    return { 
      success: false, 
      keychainWorked: false,
      storeWorked: false,
      error: error.message 
    };
  }
});

// Get platform info for the renderer
ipcMain.handle('get-platform-info', () => {
  return PLATFORM;
});

// Window control handlers
ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
  return true;
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
  return true;
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
  return true;
});

ipcMain.handle('save-message-history', (_, history) => {
  try {
    store.set('messageHistory', history);
    return true;
  } catch (error) {
    console.error('Error saving message history:', error);
    return false;
  }
});

ipcMain.handle('get-message-history', () => {
  try {
    return store.get('messageHistory', []);
  } catch (error) {
    console.error('Error retrieving message history:', error);
    return [];
  }
});

ipcMain.handle('check-online-status', () => {
  return navigator.onLine;
});

// Development mode status
ipcMain.handle('is-dev-mode', () => {
  logToFile(LOG_LEVELS.DEBUG, `Received isDev request, returning: ${isDev}`);
  return isDev;
});

// Configuration management
ipcMain.handle('get-config', () => {
  try {
    return store.get('config', DEFAULT_CONFIG);
  } catch (error) {
    console.error('Error retrieving configuration:', error);
    return DEFAULT_CONFIG;
  }
});

ipcMain.handle('save-config', (_, config) => {
  try {
    store.set('config', config);
    return true;
  } catch (error) {
    console.error('Error saving configuration:', error);
    return false;
  }
});

ipcMain.handle('reset-config', () => {
  try {
    store.set('config', DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error resetting configuration:', error);
    return DEFAULT_CONFIG;
  }
});

// Auto updater events
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

// Add IPC handlers for logging from renderer
ipcMain.handle('log-to-file', (_, level, message, data) => {
  try {
    const logLevel = level.toUpperCase();
    if (LOG_LEVELS[logLevel]) {
      return logToFile(LOG_LEVELS[logLevel], `[Renderer] ${message}`, data);
    } else {
      return logToFile(LOG_LEVELS.INFO, `[Renderer] ${message}`, data);
    }
  } catch (error) {
    console.error('Error in log-to-file handler:', error);
    return false;
  }
});

// Handle robot diagnostics logging
ipcMain.handle('log-robot-diagnostics', (_, diagnostics) => {
  try {
    logToFile(LOG_LEVELS.INFO, '====== ROBOT INTERFACE DIAGNOSTICS ======');
    logToFile(LOG_LEVELS.INFO, 'Robot diagnostics received from renderer', diagnostics);
    return true;
  } catch (error) {
    console.error('Error logging robot diagnostics:', error);
    return false;
  }
});

// App lifecycle events
app.whenReady().then(() => {
  // Initialize logging first
  initLogging();
  logToFile(LOG_LEVELS.INFO, `Application starting in ${isDev ? 'development' : 'production'} mode`);
  
  // Set up robot handlers
  try {
    logToFile(LOG_LEVELS.INFO, 'Setting up robot handlers');
    const robotHandlersInitialized = setupRobotHandlers(logToFile);
    if (robotHandlersInitialized) {
      logToFile(LOG_LEVELS.INFO, 'Robot handlers initialized successfully');
    } else {
      logToFile(LOG_LEVELS.ERROR, 'Failed to initialize robot handlers');
    }
  } catch (error) {
    logToFile(LOG_LEVELS.ERROR, 'Error setting up robot handlers:', error);
  }
  
  // Create main window
  mainWindow = createMainWindow();
  
  // Set up reload handler for development mode
  if (isDev) {
    logToFile(LOG_LEVELS.INFO, 'Development mode: enabling file watching');
    // You could add file watching here if needed
  }
  
  // Handle app reactivation on macOS
  app.on('activate', () => {
    logToFile(LOG_LEVELS.INFO, 'App activated');
    if (BrowserWindow.getAllWindows().length === 0) {
      logToFile(LOG_LEVELS.INFO, 'No windows found, creating new main window');
      mainWindow = createMainWindow();
    }
  });
  
  // Log any unhandled exceptions
  process.on('uncaughtException', (error) => {
    logToFile(LOG_LEVELS.CRITICAL, 'Uncaught Exception:', error);
    dialog.showErrorBox(
      'An error occurred',
      `An unexpected error has occurred:\n${error.message}\n\nThe error has been logged to:\n${LOG_FILE_PATH}`
    );
  });
  
  // Log any unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logToFile(LOG_LEVELS.ERROR, 'Unhandled Promise Rejection:', reason);
  });
});

app.on('window-all-closed', () => {
  logToFile(LOG_LEVELS.INFO, 'All windows closed');
  // On macOS, applications keep running unless explicitly quit
  if (process.platform !== 'darwin') {
    logToFile(LOG_LEVELS.INFO, 'Quitting application (non-macOS platform)');
    app.quit();
  }
});

app.on('before-quit', () => {
  logToFile(LOG_LEVELS.INFO, 'Application is about to quit');
  
  // Close logging
  closeLogging();
  
  // Clean up any other resources
  // ...
});

app.on('will-quit', () => {
  logToFile(LOG_LEVELS.INFO, 'Application will quit imminently');
  
  // Final cleanup
  // ...
  
  // Ensure logging is closed
  closeLogging();
});

app.on('quit', (event, exitCode) => {
  // This might not be logged if logging is already closed
  console.log(`Application has quit with exit code: ${exitCode}`);
});