try {
  // Make explicit require statements to diagnose any module loading issues
  const electron = require('electron');
  const { contextBridge, ipcRenderer } = electron;
  const path = require('path');
  
  // Log successful module loading
  console.log('Successfully loaded required modules: electron, path');

  // Simple, focused preload script that just exposes the main API
  // Avoids complex module loading that can cause issues with bundling

// Define log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARNING',
  ERROR: 'ERROR'
};

// Create a simple logger that just forwards to the main process
const logger = {
  debug: (message, data) => ipcRenderer.invoke('log-to-file', 'DEBUG', message, data),
  info: (message, data) => ipcRenderer.invoke('log-to-file', 'INFO', message, data),
  warn: (message, data) => ipcRenderer.invoke('log-to-file', 'WARN', message, data),
  error: (message, data) => ipcRenderer.invoke('log-to-file', 'ERROR', message, data),
  logRobotDiagnostics: (diagnostics) => ipcRenderer.invoke('log-robot-diagnostics', diagnostics)
};

// Simple validation utilities
const validators = {
  isString: (val) => typeof val === 'string',
  isNumber: (val) => typeof val === 'number' && !isNaN(val),
  isBoolean: (val) => typeof val === 'boolean',
  isObject: (val) => val !== null && typeof val === 'object' && !Array.isArray(val),
  isArray: (val) => Array.isArray(val),
  isFunction: (val) => typeof val === 'function'
};

// Track errors
window.addEventListener('error', (event) => {
  logger.error('Unhandled error in renderer process', {
    message: event.error?.message || 'Unknown error',
    stack: event.error?.stack || 'No stack trace'
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection in renderer process', {
    reason: event.reason?.message || 'Unknown reason',
    stack: event.reason?.stack || 'No stack trace'
  });
});

// Create robot API interface
// This handles communication with the robot modules via IPC
const robotApi = {
  // Create robot instance
  create: (data) => {
    // Ensure data is serializable by converting to JSON and back
    try {
      // Sanitize and validate input
      const serializedData = JSON.stringify(data);
      console.log('Creating robot instance with serializable data:', 
        serializedData.substring(0, 100) + (serializedData.length > 100 ? '...' : ''));
      return ipcRenderer.invoke('robot-create', JSON.parse(serializedData));
    } catch (error) {
      console.error('Non-serializable data passed to robot.create:', error);
      // Return a rejected promise with a helpful error message
      return Promise.reject(new Error(
        `Cannot serialize data for IPC communication: ${error.message}. ` +
        `Make sure you're not passing DOM elements, functions, or circular references.`
      ));
    }
  },
  
  // Face operations
  face: {
    create: (options) => ipcRenderer.invoke('robot-face-create', options)
  },
  
  // Speech operations
  speech: {
    create: (options) => ipcRenderer.invoke('robot-speech-create', options)
  },
  
  // Sentiment analysis
  sentiment: {
    analyze: (text) => ipcRenderer.invoke('robot-sentiment-analyze', text)
  },
  
  // Process message
  processSpeech: (text) => {
    // Validate text to avoid non-serializable data
    if (typeof text !== 'string') {
      console.warn('processSpeech called with non-string input, converting to string');
      text = String(text || '');
    }
    console.log('Processing robot speech:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    return ipcRenderer.invoke('robot-process-speech', text);
  },
  
  // Show/hide thinking state
  showThinking: () => ipcRenderer.invoke('robot-show-thinking'),
  hideThinking: () => ipcRenderer.invoke('robot-hide-thinking')
};

// Log that robot API has been configured
console.log('Robot API configured in preload script with methods:', Object.keys(robotApi));

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('api', {
  // API key management
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  
  // System info
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
  isDev: () => process.env.NODE_ENV === 'development',
  isDevMode: () => ipcRenderer.invoke('is-dev-mode'),
  
  // Message history management
  getMessageHistory: () => ipcRenderer.invoke('get-message-history'),
  saveMessageHistory: (history) => ipcRenderer.invoke('save-message-history', history),
  
  // Configuration management
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  
  // Network status
  checkOnlineStatus: () => ipcRenderer.invoke('check-online-status'),
  
  // Logging system
  logger: logger,
  
  // Robot API - exposing the configured robot interface
  robot: robotApi,
  
  // Event listeners
  onClearHistory: (callback) => {
    ipcRenderer.on('clear-history', callback);
    return () => ipcRenderer.removeListener('clear-history', callback);
  },
  
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', callback);
    return () => ipcRenderer.removeListener('open-settings', callback);
  },
  
  onOpenConfig: (callback) => {
    ipcRenderer.on('open-config', callback);
    return () => ipcRenderer.removeListener('open-config', callback);
  },
  
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.removeListener('update-available', callback);
  },
  
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => ipcRenderer.removeListener('update-downloaded', callback);
  },
  
  // Robot diagnostics
  onLogRobotDiagnostics: (callback) => {
    ipcRenderer.on('log-robot-diagnostics', callback);
    return () => ipcRenderer.removeListener('log-robot-diagnostics', callback);
  },
  
  onToggleRobotDiagnostics: (callback) => {
    ipcRenderer.on('toggle-robot-diagnostics', callback);
    return () => ipcRenderer.removeListener('toggle-robot-diagnostics', callback);
  },
  
  // Window control
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
});

console.log('Preload script has loaded and exposed API via contextBridge');
} catch (error) {
  // Capture and log any errors during preload initialization
  console.error('CRITICAL ERROR in preload script:', error);
  
  // Attempt to expose a minimal API even if the main one fails
  try {
    const { contextBridge } = require('electron');
    
    // Create a minimal error API
    contextBridge.exposeInMainWorld('api', {
      error: {
        message: `Preload script failed to initialize: ${error.message}`,
        stack: error.stack
      },
      // Minimal functionality for error reporting
      minimizeWindow: () => {},
      maximizeWindow: () => {},
      closeWindow: () => {}
    });
    
    console.log('Exposed minimal error API');
  } catch (exposureError) {
    console.error('Failed to expose even minimal API:', exposureError);
  }
}