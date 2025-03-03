/**
 * Simplified packaging script for the Production environment
 * 
 * This script builds the Claude Desktop application for production use.
 */

const fs = require('fs');
const path = require('path');

// Paths
const distFolder = path.resolve(__dirname, 'dist');
const srcFolder = path.join(__dirname, 'src');

// Main build function
async function buildProd() {
  try {
    console.log('🔨 Starting Production build process...');
    
    // Ensure dist directory exists
    if (!fs.existsSync(distFolder)) {
      console.log(`Creating directory: ${distFolder}`);
      fs.mkdirSync(distFolder, { recursive: true });
    }
    
    console.log('Building preload script...');
    
    // Define the preload bundle path
    const preloadPath = path.join(distFolder, 'preload.bundle.js');
    
    // Generate minimal preload script
    const preloadContent = `// Simple preload script for production
const { contextBridge, ipcRenderer } = require('electron');

// To avoid "object could not be cloned" errors
function serializeOptions(options) {
  try {
    if (!options || typeof options !== 'object') return options;
    
    // Clone options to avoid modifying the original
    const serialized = JSON.parse(JSON.stringify(options));
    
    // Remove any DOM elements or non-serializable objects
    if (serialized.container) delete serialized.container;
    if (serialized.onToggleView) delete serialized.onToggleView;
    
    return serialized;
  } catch (error) {
    console.error('Error serializing options:', error);
    return {};
  }
}

// Export minimal API for renderer
contextBridge.exposeInMainWorld('api', {
  // API key management
  getApiKey: async () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: async (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  
  // Platform info
  getPlatformInfo: async () => ipcRenderer.invoke('get-platform-info'),
  
  // Window controls
  minimizeWindow: async () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: async () => ipcRenderer.invoke('maximize-window'),
  closeWindow: async () => ipcRenderer.invoke('close-window'),
  
  // Message history
  saveMessageHistory: async (history) => ipcRenderer.invoke('save-message-history', history),
  getMessageHistory: async () => ipcRenderer.invoke('get-message-history'),
  
  // Configuration
  getConfig: async () => ipcRenderer.invoke('get-config'),
  saveConfig: async (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: async () => ipcRenderer.invoke('reset-config'),
  
  // Environment
  isDev: async () => ipcRenderer.invoke('is-dev-mode'),
  checkOnlineStatus: async () => ipcRenderer.invoke('check-online-status'),
  
  // Robot interface
  robot: {
    create: async (options) => {
      // Remove DOM elements and non-serializable objects
      const safeOptions = serializeOptions(options);
      return ipcRenderer.invoke('robot-create', safeOptions);
    },
    processSpeech: async (text) => ipcRenderer.invoke('robot-process-speech', text),
    showThinking: async () => ipcRenderer.invoke('robot-show-thinking'),
    hideThinking: async () => ipcRenderer.invoke('robot-hide-thinking')
  },
  
  // Event handlers
  onUpdateAvailable: (callback) => {
    const subscription = (event) => callback();
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (event) => callback();
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },
  onClearHistory: (callback) => {
    const subscription = (event) => callback();
    ipcRenderer.on('clear-history', subscription);
    return () => ipcRenderer.removeListener('clear-history', subscription);
  },
  onOpenSettings: (callback) => {
    const subscription = (event) => callback();
    ipcRenderer.on('open-settings', subscription);
    return () => ipcRenderer.removeListener('open-settings', subscription);
  },
  onOpenConfig: (callback) => {
    const subscription = (event) => callback();
    ipcRenderer.on('open-config', subscription);
    return () => ipcRenderer.removeListener('open-config', subscription);
  },
  
  // Logger
  logger: {
    debug: async (message, data) => {
      // Convert data to serializable format if needed
      const safeData = data ? serializeOptions(data) : null;
      return await ipcRenderer.invoke('log-to-file', 'DEBUG', message, safeData);
    },
    info: async (message, data) => {
      const safeData = data ? serializeOptions(data) : null;
      return await ipcRenderer.invoke('log-to-file', 'INFO', message, safeData);
    },
    warn: async (message, data) => {
      const safeData = data ? serializeOptions(data) : null;
      return await ipcRenderer.invoke('log-to-file', 'WARN', message, safeData);
    },
    error: async (message, data) => {
      const safeData = data ? serializeOptions(data) : null;
      return await ipcRenderer.invoke('log-to-file', 'ERROR', message, safeData);
    },
    critical: async (message, data) => {
      const safeData = data ? serializeOptions(data) : null;
      return await ipcRenderer.invoke('log-to-file', 'CRITICAL', message, safeData);
    }
  }
});

console.log('Preload script loaded with serialization support');`;

    // Write preload script to file
    fs.writeFileSync(preloadPath, preloadContent);
    console.log('Created preload.bundle.js');
    
    console.log('✅ Production build completed successfully!');
    
  } catch (error) {
    console.error('❌ Production build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildProd();