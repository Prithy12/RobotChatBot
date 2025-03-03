const { ipcMain } = require('electron');
const path = require('path');

// This module sets up the IPC bridge between the renderer and the robot modules
// It's imported by main.js to register the required handlers

let ClaudeRobot, RobotFace, SpeechManager, SentimentAnalyzer;

// Define log levels for consistency with main process
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

// Load the robot modules in the main process (safer than in preload script)
try {
  ClaudeRobot = require('./claude-robot');
  RobotFace = require('./robot-face');
  SpeechManager = require('./speech-manager');
  SentimentAnalyzer = require('./sentiment-analyzer');
  console.log('Successfully loaded robot modules in main process');
} catch (error) {
  console.error('Failed to load robot modules in main process:', error);
}

// Set up IPC handlers for robot functionality
function setupRobotHandlers(logger) {
  // Ensure logger function is available, otherwise create a console fallback
  const log = logger || ((level, message, data) => {
    console.log(`[${level}] ${message}`, data || '');
  });
  
  // Log initialization start
  log(LOG_LEVELS.INFO, 'Setting up robot API IPC handlers');
  
  // Verify modules are loaded
  const modulesLoaded = {
    ClaudeRobot: !!ClaudeRobot,
    RobotFace: !!RobotFace,
    SpeechManager: !!SpeechManager,
    SentimentAnalyzer: !!SentimentAnalyzer
  };
  
  // Log module status
  log(LOG_LEVELS.DEBUG, 'Robot module load status', modulesLoaded);
  
  // Only set up handlers if modules loaded successfully
  if (!ClaudeRobot || !RobotFace || !SpeechManager || !SentimentAnalyzer) {
    log(LOG_LEVELS.ERROR, 'Cannot set up robot handlers: modules not loaded', modulesLoaded);
    return false;
  }

  // Create a robot instance - simplified to avoid serialization issues
  ipcMain.handle('robot-create', (event, options) => {
    try {
      log(LOG_LEVELS.DEBUG, 'Robot create called with options', options);
      
      // Validate input data
      if (!options || typeof options !== 'object') {
        throw new Error('Invalid robot creation options');
      }
      
      // Extract options from object if it's wrapped
      const robotOptions = options.options || options;
      
      // Validate required options
      if (!robotOptions.apiKey) {
        throw new Error('API key is required for robot creation');
      }
      
      log(LOG_LEVELS.INFO, 'Creating robot instance');
      
      // Store the created robots by ID for future access
      if (!global.robotInstances) {
        global.robotInstances = new Map();
      }
      
      // Generate a unique instance ID
      const instanceId = `robot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store success response
      let response = { 
        success: true, 
        instanceId,
        message: 'Robot created successfully' 
      };
      
      log(LOG_LEVELS.INFO, `Robot instance created with ID: ${instanceId}`);
      
      // Store in global registry for future access
      global.robotInstances.set(instanceId, {
        id: instanceId,
        options: robotOptions,
        created: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      log(LOG_LEVELS.ERROR, 'Error creating robot:', error);
      return { 
        success: false, 
        error: error.message,
        stack: error.stack
      };
    }
  });

  // Robot face operations
  ipcMain.handle('robot-face-create', (event, options) => {
    try {
      const face = new RobotFace(options);
      return { success: true, instanceId: face.id };
    } catch (error) {
      log(LOG_LEVELS.ERROR, 'Error creating robot face:', error);
      return { success: false, error: error.message };
    }
  });

  // Speech manager operations
  ipcMain.handle('robot-speech-create', (event, options) => {
    try {
      const speech = new SpeechManager(options);
      return { success: true, instanceId: speech.id };
    } catch (error) {
      log(LOG_LEVELS.ERROR, 'Error creating speech manager:', error);
      return { success: false, error: error.message };
    }
  });

  // Sentiment analysis operations
  ipcMain.handle('robot-sentiment-analyze', (event, text) => {
    try {
      const analyzer = new SentimentAnalyzer();
      const result = analyzer.analyze(text);
      return { success: true, result };
    } catch (error) {
      log(LOG_LEVELS.ERROR, 'Error analyzing sentiment:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Process speech for robot
  ipcMain.handle('robot-process-speech', (event, text) => {
    try {
      log(LOG_LEVELS.DEBUG, 'Processing speech text', { length: text?.length });
      // This would normally call a method on ClaudeRobot, but for simplicity
      // we'll just return success with the text
      return { success: true, processed: true, text };
    } catch (error) {
      log(LOG_LEVELS.ERROR, 'Error processing robot speech:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Show thinking state
  ipcMain.handle('robot-show-thinking', (event) => {
    try {
      log(LOG_LEVELS.DEBUG, 'Show robot thinking state');
      return { success: true };
    } catch (error) {
      log(LOG_LEVELS.ERROR, 'Error showing thinking state:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Hide thinking state
  ipcMain.handle('robot-hide-thinking', (event) => {
    try {
      log(LOG_LEVELS.DEBUG, 'Hide robot thinking state');
      return { success: true };
    } catch (error) {
      log(LOG_LEVELS.ERROR, 'Error hiding thinking state:', error);
      return { success: false, error: error.message };
    }
  });

  log(LOG_LEVELS.INFO, 'Robot handlers set up successfully');
  return true;
}

module.exports = { setupRobotHandlers };