const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Import required modules for robot interface
// Using a safer dynamic import approach to avoid bundling issues
let ClaudeRobot, RobotFace, SpeechManager, SentimentAnalyzer;

// Helper function to safely import modules with detailed error reporting
async function safeImport(moduleName) {
  try {
    // Use static paths instead of dynamic requires to avoid webpack warnings
    if (moduleName === './claude-robot') {
      return require('./claude-robot');
    } else if (moduleName === './robot-face') {
      return require('./robot-face');
    } else if (moduleName === './speech-manager') {
      return require('./speech-manager');
    } else if (moduleName === './sentiment-analyzer') {
      return require('./sentiment-analyzer');
    } else {
      console.error(`Unknown module: ${moduleName}`);
      return null;
    }
  } catch (error) {
    console.error(`Failed to import module '${moduleName}':`, error.message);
    // Return a mock implementation to prevent crashes
    return null;
  }
}

// Initialize robot modules asynchronously to better handle errors
async function initRobotModules() {
  try {
    // Get the app path from additionalArguments
    const appPath = getAppPath();
    console.log('App path for module loading:', appPath);
    
    // Use dynamic requires to load modules from the correct path
    if (appPath) {
      // Try to load from the src directory
      const modulePath = path.join(appPath);
      console.log('Loading robot modules from:', modulePath);
      
      try {
        ClaudeRobot = require(path.join(modulePath, 'claude-robot'));
        RobotFace = require(path.join(modulePath, 'robot-face'));
        SpeechManager = require(path.join(modulePath, 'speech-manager'));
        SentimentAnalyzer = require(path.join(modulePath, 'sentiment-analyzer'));
        console.log('Successfully loaded robot modules from app path');
      } catch (moduleError) {
        console.error('Error loading from app path:', moduleError);
        // Fall back to relative imports
        ClaudeRobot = await safeImport('./claude-robot');
        RobotFace = await safeImport('./robot-face');
        SpeechManager = await safeImport('./speech-manager');
        SentimentAnalyzer = await safeImport('./sentiment-analyzer');
      }
    } else {
      // Fall back to relative imports if app path not available
      ClaudeRobot = await safeImport('./claude-robot');
      RobotFace = await safeImport('./robot-face');
      SpeechManager = await safeImport('./speech-manager');
      SentimentAnalyzer = await safeImport('./sentiment-analyzer');
    }
    
    console.log('Successfully loaded robot modules in preload');
    return true;
  } catch (error) {
    console.error('Failed to load robot modules in preload:', error);
    return false;
  }
}

// Helper function to get the app path from additionalArguments
function getAppPath() {
  try {
    const args = process.argv;
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--app-path=')) {
        return args[i].replace('--app-path=', '');
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting app path:', error);
    return null;
  }
}

// Initialize modules
initRobotModules();

// Define log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

// Create a logger function for use in renderer
function createRendererLogger() {
  // Basic implementation that forwards logs to the main process
  const logToMain = (level, message, data = null) => {
    try {
      return ipcRenderer.invoke('log-to-file', level, message, data);
    } catch (error) {
      console.error('Failed to send log to main process:', error);
      return false;
    }
  };
  
  // Return logger object with methods for each level
  return {
    debug: (message, data) => logToMain('DEBUG', message, data),
    info: (message, data) => logToMain('INFO', message, data),
    warn: (message, data) => logToMain('WARN', message, data),
    error: (message, data) => logToMain('ERROR', message, data),
    critical: (message, data) => logToMain('CRITICAL', message, data),
    
    // Helper to log robot diagnostics specifically
    logRobotDiagnostics: (diagnostics) => {
      return ipcRenderer.invoke('log-robot-diagnostics', diagnostics);
    }
  };
}

// Create the logger instance
const logger = createRendererLogger();

// Validation utilities for secure IPC
const validators = {
  isString: (val) => typeof val === 'string',
  isNonEmptyString: (val) => typeof val === 'string' && val.trim().length > 0,
  isNumber: (val) => typeof val === 'number' && !isNaN(val),
  isBoolean: (val) => typeof val === 'boolean',
  isObject: (val) => val !== null && typeof val === 'object' && !Array.isArray(val),
  isArray: (val) => Array.isArray(val),
  isFunction: (val) => typeof val === 'function',
  isValidApiKey: (val) => validators.isNonEmptyString(val) && val.length > 10,
  isElement: (val) => val instanceof Element || (typeof val === 'object' && val !== null && val.nodeType === 1),
  
  // Validate specific object structures
  isValidRobotOptions: (options) => {
    if (!validators.isObject(options)) return false;
    
    // Required fields
    if (!validators.isValidApiKey(options.apiKey)) return false;
    
    // Optional fields with type validation
    if (options.debug !== undefined && !validators.isBoolean(options.debug)) return false;
    if (options.enableSpeech !== undefined && !validators.isBoolean(options.enableSpeech)) return false;
    if (options.enableTranscript !== undefined && !validators.isBoolean(options.enableTranscript)) return false;
    if (options.enableSentimentAnalysis !== undefined && !validators.isBoolean(options.enableSentimentAnalysis)) return false;
    if (options.defaultSystemPrompt !== undefined && !validators.isString(options.defaultSystemPrompt)) return false;
    
    return true;
  },
  
  isValidConfig: (config) => {
    if (!validators.isObject(config)) return false;
    
    // Validate required fields
    if (config.model !== undefined && !validators.isString(config.model)) return false;
    if (config.maxTokens !== undefined && !validators.isNumber(config.maxTokens)) return false;
    if (config.temperature !== undefined && !validators.isNumber(config.temperature)) return false;
    if (config.maxHistoryLength !== undefined && !validators.isNumber(config.maxHistoryLength)) return false;
    
    return true;
  }
};

// Track unhandled errors and log them
window.addEventListener('error', (event) => {
  logger.error('Unhandled error in renderer process', {
    message: event.error?.message || 'Unknown error',
    stack: event.error?.stack || 'No stack trace',
    source: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

// Track unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection in renderer process', {
    reason: event.reason?.message || 'Unknown reason',
    stack: event.reason?.stack || 'No stack trace'
  });
});

// Determine if we're running in development mode
// First try to access through IPC, with a fallback mechanism
let cachedDevMode = null;

function isDev() {
  // If we've already determined dev mode status, return the cached value
  if (cachedDevMode !== null) {
    return cachedDevMode;
  }
  
  try {
    // Try to get isDev status through IPC
    ipcRenderer.invoke('is-dev-mode').then(result => {
      cachedDevMode = result;
    }).catch(error => {
      console.error('Failed to get isDev status through IPC:', error);
      // Fallback detection mechanisms
      cachedDevMode = process.env.NODE_ENV === 'development' || 
                     /electron/.test(process.execPath.toLowerCase());
    });
    
    // Return a reasonable default until we get a response
    return process.env.NODE_ENV === 'development' || 
           /electron/.test(process.execPath.toLowerCase());
  } catch (error) {
    console.error('Error checking dev mode:', error);
    // Default to false if all detection methods fail
    return false;
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // API key management with validation
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (apiKey) => {
    if (!validators.isValidApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }
    return ipcRenderer.invoke('save-api-key', apiKey);
  },
  
  // System info
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
  isDev: () => isDev(), // Expose isDev function
  isDevMode: () => ipcRenderer.invoke('is-dev-mode'), // Direct IPC call alternative
  
  // Message history management with validation
  getMessageHistory: () => ipcRenderer.invoke('get-message-history'),
  saveMessageHistory: (history) => {
    if (!validators.isArray(history)) {
      throw new Error('Message history must be an array');
    }
    return ipcRenderer.invoke('save-message-history', history);
  },
  
  // Configuration management with validation
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => {
    if (!validators.isValidConfig(config)) {
      throw new Error('Invalid configuration object');
    }
    return ipcRenderer.invoke('save-config', config);
  },
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  
  // Network status
  checkOnlineStatus: () => ipcRenderer.invoke('check-online-status'),
  
  // Logging system
  logger: logger,
  
  // Event listeners with validation
  onClearHistory: (callback) => {
    if (!validators.isFunction(callback)) {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('clear-history', callback);
    return () => ipcRenderer.removeListener('clear-history', callback);
  },
  
  onOpenSettings: (callback) => {
    if (!validators.isFunction(callback)) {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('open-settings', callback);
    return () => ipcRenderer.removeListener('open-settings', callback);
  },
  
  onOpenConfig: (callback) => {
    if (!validators.isFunction(callback)) {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('open-config', callback);
    return () => ipcRenderer.removeListener('open-config', callback);
  },
  
  onUpdateAvailable: (callback) => {
    if (!validators.isFunction(callback)) {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.removeListener('update-available', callback);
  },
  
  onUpdateDownloaded: (callback) => {
    if (!validators.isFunction(callback)) {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('update-downloaded', callback);
    return () => ipcRenderer.removeListener('update-downloaded', callback);
  },
  
  // Robot diagnostics with validation
  onLogRobotDiagnostics: (callback) => {
    if (!validators.isFunction(callback)) {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('log-robot-diagnostics', callback);
    return () => ipcRenderer.removeListener('log-robot-diagnostics', callback);
  },
  
  onToggleRobotDiagnostics: (callback) => {
    if (!validators.isFunction(callback)) {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('toggle-robot-diagnostics', callback);
    return () => ipcRenderer.removeListener('toggle-robot-diagnostics', callback);
  },
  
  // Window control
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Robot interface - exposing specific methods rather than entire modules
  robot: {
    // Robot creation
    create: (container, options) => {
      if (!validators.isElement(container)) {
        throw new Error('Container must be a valid DOM element');
      }
      
      if (!validators.isValidRobotOptions(options)) {
        throw new Error('Invalid robot options');
      }
      
      // Create the robot instance with validated parameters
      return new ClaudeRobot(container, options);
    },
    
    // Robot face methods
    face: {
      create: (container, options) => {
        if (!validators.isElement(container)) {
          throw new Error('Container must be a valid DOM element');
        }
        
        return new RobotFace(container, options);
      }
    },
    
    // Speech-related methods
    speech: {
      create: (options) => new SpeechManager(options),
      speak: (text, options) => {
        if (!validators.isString(text)) {
          throw new Error('Text must be a string');
        }
        
        const speechManager = new SpeechManager(options);
        return speechManager.speak(text);
      }
    },
    
    // Sentiment analysis methods
    sentiment: {
      analyze: (text) => {
        if (!validators.isString(text)) {
          throw new Error('Text must be a string');
        }
        
        const analyzer = new SentimentAnalyzer();
        return analyzer.analyze(text);
      }
    }
  }
});