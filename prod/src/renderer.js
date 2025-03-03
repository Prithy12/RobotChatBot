// DOM Elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const thinkingIndicator = document.getElementById('thinking-indicator');
const offlineIndicator = document.getElementById('offline-indicator');
const settingsModal = document.getElementById('settings-modal');
const updateModal = document.getElementById('update-modal');
const configModal = document.getElementById('config-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyButton = document.getElementById('save-api-key');
const apiKeyLink = document.getElementById('api-key-link');
const closeButtons = document.querySelectorAll('.close-button');
const installUpdateButton = document.getElementById('install-update');
const skipUpdateButton = document.getElementById('skip-update');

// Configuration elements
const modelSelect = document.getElementById('model-select');
const maxTokensInput = document.getElementById('max-tokens');
const temperatureSlider = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperature-value');
const maxHistoryInput = document.getElementById('max-history');
const themeSelect = document.getElementById('theme-select');
const fontSizeSelect = document.getElementById('font-size');
const interfaceModeSelect = document.getElementById('interface-mode');
const systemPromptInput = document.getElementById('system-prompt');
const resetConfigButton = document.getElementById('reset-config');
const saveConfigButton = document.getElementById('save-config');
const closeConfigButton = document.getElementById('close-config-button');

// App control buttons
const settingsButton = document.getElementById('settings-button');
const configButton = document.getElementById('config-button');

// Window control buttons
const minimizeButton = document.getElementById('minimize-button');
const maximizeButton = document.getElementById('maximize-button');
const closeButton = document.getElementById('close-button');

// Application State
let isOnline = navigator.onLine;
let apiKey = null;
let messageHistory = [];
let isWaitingForResponse = false;
let platformInfo = null;
let appConfig = null;

// Constants
const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

// Global error handler for catching unhandled exceptions
function setupGlobalErrorHandling() {
  // Track and handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    
    // Log error to main process
    if (window.api && window.api.logger) {
      window.api.logger.error('Uncaught renderer error', {
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack || 'No stack trace',
        location: `${event.filename}:${event.lineno}:${event.colno}`
      });
    }
    
    // Show user-friendly error message if it's not already being handled
    if (!event.defaultPrevented) {
      displayErrorMessage(`An unexpected error occurred: ${event.error?.message || 'Unknown error'}`);
    }
  });
  
  // Track and handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Log error to main process
    if (window.api && window.api.logger) {
      window.api.logger.error('Unhandled promise rejection', {
        message: event.reason?.message || 'Unknown reason',
        stack: event.reason?.stack || 'No stack trace'
      });
    }
    
    // Show user-friendly error message
    displayErrorMessage(`A promise rejection was not handled: ${event.reason?.message || 'Unknown reason'}`);
  });
  
  // Log when app is about to unload (cleanup)
  window.addEventListener('beforeunload', () => {
    if (window.api && window.api.logger) {
      window.api.logger.info('Renderer process unloading');
    }
    
    // Perform cleanup here
    cleanupResources();
  });
}

// Cleanup function to remove event listeners and free resources
function cleanupResources() {
  // Clean up any event listeners that were registered
  const cleanupFunctions = window._eventCleanupFunctions || [];
  
  cleanupFunctions.forEach(cleanup => {
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch (e) {
        console.error('Error during cleanup:', e);
      }
    }
  });
  
  // Reset the cleanup array
  window._eventCleanupFunctions = [];
  
  // Additional cleanup
  if (window.claudeRobot && typeof window.claudeRobot.dispose === 'function') {
    try {
      window.claudeRobot.dispose();
    } catch (e) {
      console.error('Error disposing robot interface:', e);
    }
  }
}

// Helper to register cleanup functions
function registerCleanup(cleanupFn) {
  if (!window._eventCleanupFunctions) {
    window._eventCleanupFunctions = [];
  }
  
  if (typeof cleanupFn === 'function') {
    window._eventCleanupFunctions.push(cleanupFn);
    return true;
  }
  
  return false;
}

// Initialize the application
async function initialize() {
  try {
    // Check if preload script is properly loaded by checking for window.api
    if (!window.api) {
      // Display critical error about preload script not being available
      console.error("Critical Error: window.api is undefined. Preload script did not load correctly.");
      
      // Create a visible error message in the UI without using any API
      const errorDiv = document.createElement('div');
      errorDiv.style.position = 'fixed';
      errorDiv.style.top = '50%';
      errorDiv.style.left = '50%';
      errorDiv.style.transform = 'translate(-50%, -50%)';
      errorDiv.style.padding = '20px';
      errorDiv.style.background = '#ffcdd2';
      errorDiv.style.color = '#b71c1c';
      errorDiv.style.borderRadius = '5px';
      errorDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      errorDiv.style.maxWidth = '80%';
      errorDiv.style.textAlign = 'center';
      errorDiv.style.zIndex = '9999';
      
      errorDiv.innerHTML = `
        <h2 style="margin-top: 0;">Application Error</h2>
        <p>The preload script failed to load correctly. The application cannot continue.</p>
        <p>This is usually caused by one of the following issues:</p>
        <ul style="text-align: left; margin-bottom: 20px;">
          <li>The preload script path is incorrect in the main process configuration</li>
          <li>There was an error bundling the preload script with webpack</li>
          <li>A required Node.js module (like 'path') could not be found</li>
        </ul>
        <p style="font-weight: bold; margin-top: 15px;">How to Fix:</p>
        <ol style="text-align: left; margin-bottom: 20px;">
          <li>Open the developer tools (Ctrl+Shift+I) and check for errors</li>
          <li>Run <code>node scripts/debug-preload.js</code> to diagnose webpack configuration issues</li>
          <li>Rebuild the preload bundle with <code>npx webpack</code> after fixing any issues</li>
          <li>Restart the application</li>
        </ol>
        <p>Please check the developer console for more information.</p>
        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 15px;">
          <button id="open-devtools" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Open DevTools
          </button>
          <button id="restart-app" style="padding: 8px 16px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Restart Application
          </button>
        </div>
      `;
      
      document.body.appendChild(errorDiv);
      
      // Add event listener to restart button
      document.getElementById('restart-app').addEventListener('click', () => {
        location.reload();
      });
      
      // Add event listener to open DevTools button
      document.getElementById('open-devtools').addEventListener('click', () => {
        // Try to open DevTools via minimal API or as a fallback use a debug query parameter
        if (window.api && window.api.openDevTools) {
          window.api.openDevTools();
        } else {
          // Reload with a special query parameter that might be handled by the main process
          location.href = location.href + (location.href.includes('?') ? '&' : '?') + 'openDevTools=true';
        }
      });
      
      // Check if there's a specific error message from the preload script
      if (window.api && window.api.error) {
        const errorMessageElem = document.createElement('div');
        errorMessageElem.style.marginTop = '15px';
        errorMessageElem.style.padding = '10px';
        errorMessageElem.style.background = '#f8d7da';
        errorMessageElem.style.border = '1px solid #f5c6cb';
        errorMessageElem.style.borderRadius = '4px';
        errorMessageElem.style.fontFamily = 'monospace';
        errorMessageElem.style.whiteSpace = 'pre-wrap';
        errorMessageElem.style.maxHeight = '150px';
        errorMessageElem.style.overflow = 'auto';
        errorMessageElem.textContent = `Error: ${window.api.error.message}\n${window.api.error.stack || ''}`;
        
        // Add error details to the error div
        const buttonsContainer = document.querySelector('#restart-app').parentNode;
        errorDiv.insertBefore(errorMessageElem, buttonsContainer);
      }
      
      // Exit initialization to prevent further errors
      return;
    }
    
    // Setup global error handling
    setupGlobalErrorHandling();
    
    // Get platform information with error handling
    try {
      platformInfo = await window.api.getPlatformInfo();
    } catch (platformError) {
      console.error("Failed to get platform info:", platformError);
      // Create a fallback platform info object
      platformInfo = {
        isWindows: navigator.platform.includes('Win'),
        isMac: navigator.platform.includes('Mac'),
        isLinux: navigator.platform.includes('Linux'),
        isWSL: false
      };
    }
    
    // Load configuration with error handling
    try {
      appConfig = await window.api.getConfig();
    } catch (configError) {
      console.error("Failed to load configuration:", configError);
      // Create default configuration as fallback
      appConfig = {
        model: 'claude-3-haiku-20240307',
        maxTokens: 1024,
        maxHistoryLength: 100,
        systemPrompt: 'You are Claude, an AI assistant by Anthropic.',
        temperature: 0.7,
        theme: 'dark',
        fontSize: 'medium'
      };
    }
    
    // Set up configuration UI values
    updateConfigUI();
    
    // Check if API key exists
    apiKey = await window.api.getApiKey();
    
    // Check for robot interface mode preference
    const robotMode = localStorage.getItem('robot-interface-enabled') === 'true';
    
    if (robotMode) {
      await initializeRobotInterface();
    } else {
      if (!apiKey) {
        showSettingsModal();
        displaySystemMessage('Welcome to Claude Desktop! Please enter your API key to get started.');
      } else {
        displaySystemMessage('Welcome to Claude Desktop! Start chatting with Claude.');
      }
      
      // Load message history
      try {
        const savedHistory = await window.api.getMessageHistory();
        if (savedHistory && savedHistory.length > 0) {
          messageHistory = savedHistory;
          renderMessageHistory();
        }
      } catch (historyError) {
        console.error('Failed to load message history:', historyError);
        displayErrorMessage('Could not load message history. Starting with a new conversation.');
        messageHistory = [];
      }
    }
    
    // Apply appearance settings
    applyAppearanceSettings();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check network status
    checkNetworkStatus();
    
    // Show update modal if update is available
    const updateAvailableCleanup = window.api.onUpdateAvailable(() => {
      updateModal.classList.remove('hidden');
    });
    registerCleanup(updateAvailableCleanup);
    
    const updateDownloadedCleanup = window.api.onUpdateDownloaded(() => {
      displaySystemMessage('Update downloaded. It will be installed when you restart the application.');
    });
    registerCleanup(updateDownloadedCleanup);
    
    // WSL warning if applicable
    if (platformInfo && platformInfo.isWSL) {
      displaySystemMessage('Running in WSL environment. Some features like secure credential storage might have limited functionality. If you encounter issues, try running the app in Windows directly.');
    }
    
    // Log successful initialization
    if (window.api && window.api.logger) {
      window.api.logger.info('Renderer successfully initialized');
    }
  } catch (initError) {
    console.error('Error during application initialization:', initError);
    
    // Log to main process
    if (window.api && window.api.logger) {
      window.api.logger.critical('Failed to initialize renderer', {
        error: initError.message,
        stack: initError.stack
      });
    }
    
    // Show critical error to user
    displayErrorMessage(`Failed to initialize the application: ${initError.message}`);
  }
}

// Initialize robot interface
async function initializeRobotInterface() {
  console.log('Initializing robot interface...');
  
  // Load required CSS for robot face UI
  loadRobotStyles();
  
  // Hide chat UI elements
  document.getElementById('chat-messages').style.display = 'none';
  document.getElementById('chat-input-container').style.display = 'none';
  
  // Create robot container
  const robotContainer = document.createElement('div');
  robotContainer.id = 'robot-interface';
  document.getElementById('chat-container').appendChild(robotContainer);
  
  // Create debug interface if in development mode (for troubleshooting)
  let debugSection = null;
  
  // Safely check for development mode with error handling
  let isInDevMode = false;
  try {
    isInDevMode = window.api.isDev();
  } catch (error) {
    console.warn('Failed to check dev mode using primary method:', error);
    // Fallback: try direct IPC method
    try {
      window.api.isDevMode()
        .then(result => {
          isInDevMode = result;
          if (isInDevMode && !debugSection) {
            debugSection = createDebugInterface();
            document.getElementById('chat-container').appendChild(debugSection);
          }
        })
        .catch(err => {
          console.error('Failed to check dev mode using IPC fallback:', err);
          // Default to false for safety
          isInDevMode = false;
        });
    } catch (ipcError) {
      console.error('Failed to check dev mode using all methods:', ipcError);
      // Default to false for safety
      isInDevMode = false;
    }
  }
  
  if (isInDevMode) {
    debugSection = createDebugInterface();
    document.getElementById('chat-container').appendChild(debugSection);
  }
  
  // Feature detection
  const shouldUseFallbacks = !detectSvgSupport() || !detectWebSpeechSupport();
  console.log(`Feature detection: Using fallbacks: ${shouldUseFallbacks ? 'Yes' : 'No'}`);
  
  // Import and initialize robot interface
  try {
    // Access the robot API through the preload bridge
    try {
      // Debug API bridge - log detailed structure
      console.log('API bridge contents:', Object.keys(window.api));
      console.log('Robot API available:', !!window.api.robot);
      if (window.api.robot) {
        console.log('Robot API methods:', Object.keys(window.api.robot));
        console.log('Robot create function type:', typeof window.api.robot.create);
      } else {
        console.log('Robot API is undefined in the API bridge');
      }
      
      // Check if robot API is available
      if (!window.api.robot || typeof window.api.robot.create !== 'function') {
        throw new Error('Robot API not available in API bridge');
      }
      
      console.log('Successfully accessed robot API through the preload bridge');
    } catch (importError) {
      console.error('Failed to access robot API:', importError);
      
      // Show error in UI and return early
      displayErrorMessage(`Failed to initialize robot interface: ${importError.message}`);
      document.getElementById('chat-messages').style.display = 'flex';
      document.getElementById('chat-input-container').style.display = 'flex';
      return;
    }
    
    // Initialize robot with current configuration
    const robotOptions = {
      apiKey: apiKey,
      defaultSystemPrompt: appConfig.systemPrompt || 'You are Claude, an AI assistant by Anthropic.',
      enableSpeech: true, 
      enableTranscript: true,
      enableSentimentAnalysis: true,
      fallbackMode: shouldUseFallbacks, // Automatically use fallbacks if needed
      debug: isInDevMode, // Use our safely determined dev mode status
      onToggleView: () => {
        // Switch to chat interface
        localStorage.setItem('robot-interface-enabled', 'false');
        location.reload();
      },
      faceOptions: {
        primaryColor: '#8A7CFF',
        backgroundColor: '#23252F',
        eyeColor: '#8A7CFF',
        speakingColor: '#5EB3FF',
        thinkingColor: '#FFB84D',
        errorColor: '#FF5E5E'
      },
      speechOptions: {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
        lang: 'en-US'
      }
    };
    
    console.log('Creating ClaudeRobot instance with options:', robotOptions);
    
    // Create robot instance using the secure API
    try {
      console.log('Calling window.api.robot.create with options');
      console.log('Robot API create method:', window.api.robot.create);
      
      // CRITICAL FIX: Don't pass DOM elements via IPC
      // Extract only serializable options and pass element ID instead of the DOM element
      const serializableOptions = { ...robotOptions };
      
      // Remove any non-serializable properties
      delete serializableOptions.onToggleView; // Functions can't be serialized
      
      // Log the sanitized options for debugging
      console.log('Sanitized options for IPC:', JSON.stringify(serializableOptions));
      
      // First, verify the container exists and is valid
      const containerElement = document.getElementById('robot-interface');
      if (!containerElement) {
        console.error('Container element with ID "robot-interface" not found');
        throw new Error('Container element with ID "robot-interface" not found');
      }
      console.log('Container element verified:', containerElement);
      
      // Initialize speech manager
      window.speechManager = new SpeechManager({
        rate: robotOptions.speechOptions?.rate || 1.0,
        pitch: robotOptions.speechOptions?.pitch || 1.0,
        volume: robotOptions.speechOptions?.volume || 0.8,
        language: robotOptions.speechOptions?.lang || 'en-US',
        onStart: () => {
          // Trigger speaking animation when speech starts
          triggerEmotionAnimation('speaking');
        },
        onEnd: () => {
          // Reset animation when speech ends
          triggerEmotionAnimation('happy');
        },
        onError: (error) => {
          console.error('Speech error:', error);
          // Continue with visual response even if speech fails
          triggerEmotionAnimation('neutral');
        }
      });
      
      // Pass the container ID instead of the DOM element
      const containerId = robotContainer.id;
      console.log('Using container ID for IPC:', containerId);
      
      // Try to call the create method with serializable data
      const result = await window.api.robot.create({
        containerId: containerId,
        options: serializableOptions
      });
      
      console.log('Create method result:', result);
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Unknown error creating robot');
      }
      
      // Create a mock robot object that the renderer can use
      window.claudeRobot = {
        state: {
          initialized: true,
          usingFallbacks: { overall: false, face: false, speech: false }
        },
        instanceId: result.instanceId,
        // Add proxy methods that call through IPC
        processSpeech: (text) => window.api.robot.processSpeech(text),
        processUserInput: (text) => {
          // Update the UI to show user input
          const userMessage = document.createElement('div');
          userMessage.className = 'robot-user-message';
          userMessage.style.padding = '10px 15px';
          userMessage.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          userMessage.style.borderRadius = '10px';
          userMessage.style.margin = '10px 20px';
          userMessage.style.maxWidth = '80%';
          userMessage.style.alignSelf = 'flex-end';
          userMessage.textContent = text;
          
          // Find or create messages container
          let messagesContainer = document.querySelector('.robot-messages-container');
          if (!messagesContainer) {
            messagesContainer = document.createElement('div');
            messagesContainer.className = 'robot-messages-container';
            messagesContainer.style.display = 'flex';
            messagesContainer.style.flexDirection = 'column';
            messagesContainer.style.overflowY = 'auto';
            messagesContainer.style.maxHeight = '300px';
            messagesContainer.style.margin = '20px 0';
            
            // Insert before the text input area
            const containerElement = document.getElementById('robot-interface');
            const inputContainer = containerElement.querySelector('.robot-input-container');
            if (inputContainer) {
              containerElement.insertBefore(messagesContainer, inputContainer);
            } else {
              containerElement.appendChild(messagesContainer);
            }
          }
          
          // Add message to container
          messagesContainer.appendChild(userMessage);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          
          return window.api.robot.processSpeech(text);
        },
        showThinking: () => {
          // Update UI to show thinking state
          const robotFace = document.querySelector('.robot-face');
          if (robotFace) {
            // Change eyes to thinking color
            const eyes = robotFace.querySelectorAll('.robot-eye');
            eyes.forEach(eye => {
              eye.style.backgroundColor = '#FFB84D'; // Thinking color
              eye.style.animation = 'pulse 1.5s infinite alternate';
            });
            
            // Add thinking indicator message
            const messagesContainer = document.querySelector('.robot-messages-container');
            if (messagesContainer) {
              const thinkingIndicator = document.createElement('div');
              thinkingIndicator.className = 'robot-thinking-indicator';
              thinkingIndicator.style.padding = '10px 15px';
              thinkingIndicator.style.backgroundColor = 'rgba(255, 184, 77, 0.1)';
              thinkingIndicator.style.borderRadius = '10px';
              thinkingIndicator.style.margin = '10px 20px';
              thinkingIndicator.style.maxWidth = '80%';
              thinkingIndicator.style.alignSelf = 'flex-start';
              thinkingIndicator.style.display = 'flex';
              thinkingIndicator.style.alignItems = 'center';
              thinkingIndicator.style.color = '#FFB84D';
              thinkingIndicator.innerHTML = '<span style="margin-right:10px">Thinking</span><span class="thinking-dots">...</span>';
              
              messagesContainer.appendChild(thinkingIndicator);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
              
              // Add animation to the dots
              const thinkingDots = thinkingIndicator.querySelector('.thinking-dots');
              if (thinkingDots) {
                let dotsCount = 3;
                window.thinkingInterval = setInterval(() => {
                  thinkingDots.textContent = '.'.repeat(dotsCount);
                  dotsCount = (dotsCount % 3) + 1;
                }, 500);
              }
            }
          }
          
          return window.api.robot.showThinking();
        },
        hideThinking: () => {
          // Reset UI thinking state
          const robotFace = document.querySelector('.robot-face');
          if (robotFace) {
            // Reset eyes to normal color
            const eyes = robotFace.querySelectorAll('.robot-eye');
            eyes.forEach(eye => {
              eye.style.backgroundColor = '#8A7CFF'; // Default color
              eye.style.animation = '';
            });
            
            // Remove thinking indicator if it exists
            const thinkingIndicator = document.querySelector('.robot-thinking-indicator');
            if (thinkingIndicator) {
              thinkingIndicator.remove();
            }
            
            // Clear thinking animation interval
            if (window.thinkingInterval) {
              clearInterval(window.thinkingInterval);
              window.thinkingInterval = null;
            }
          }
          
          return window.api.robot.hideThinking();
        },
        processClaudeResponse: (text) => {
          if (!text) return;
          
          // Update UI with Claude's response using the new emotion system
          const robotFace = document.querySelector('.robot-face');
          if (robotFace) {
            // Trigger speaking animation
            triggerEmotionAnimation('speaking');
            
            // Add response message
            const messagesContainer = document.querySelector('.robot-messages-container');
            if (messagesContainer) {
              const responseMessage = document.createElement('div');
              responseMessage.className = 'robot-claude-message';
              responseMessage.style.padding = '10px 15px';
              responseMessage.style.backgroundColor = 'rgba(94, 179, 255, 0.1)';
              responseMessage.style.borderRadius = '10px';
              responseMessage.style.margin = '10px 20px';
              responseMessage.style.maxWidth = '80%';
              responseMessage.style.alignSelf = 'flex-start';
              responseMessage.style.color = '#FFFFFF';
              responseMessage.textContent = text;
              
              messagesContainer.appendChild(responseMessage);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Speak the response using the speech manager
            try {
              if (window.speechManager) {
                // Determine how much of the text to speak (to avoid very long responses)
                let textToSpeak = text;
                
                // For long responses, limit to first few sentences for better UX
                if (text.length > 500) {
                  // Extract roughly the first 2-3 sentences
                  const sentences = text.split(/[.!?]+/);
                  const shortText = sentences.slice(0, Math.min(3, sentences.length)).join('. ');
                  
                  // If the shortened text is still substantial, use it
                  if (shortText.length > 100) {
                    textToSpeak = shortText + '. And more.';
                  }
                }
                
                // Speak the text and manage the speech lifecycle
                window.speechManager.speak(textToSpeak, {
                  onStart: () => {
                    console.log('Speech started');
                    // Animation is handled by speech manager's global handlers
                  },
                  onEnd: () => {
                    console.log('Speech ended');
                    // Switch to happy expression when done speaking
                    triggerEmotionAnimation('happy');
                  },
                  onError: (error) => {
                    console.error('Error speaking text:', error);
                    // Fallback to timed animation if speech fails
                    setTimeout(() => {
                      triggerEmotionAnimation('happy');
                    }, 3000);
                  }
                });
              } else {
                // If speech manager is unavailable, fall back to timed animation
                setTimeout(() => {
                  triggerEmotionAnimation('happy');
                }, 3000);
              }
            } catch (speechError) {
              console.error('Error using speech synthesis:', speechError);
              // Fallback to timed animation reset
              setTimeout(() => {
                triggerEmotionAnimation('happy');
              }, 3000);
            }
          }
        },
        showError: (errorText) => {
          // Update UI to show error state using the new emotion system
          const robotFace = document.querySelector('.robot-face');
          if (robotFace) {
            // Trigger error animation
            triggerEmotionAnimation('error');
            
            // Add error message
            const messagesContainer = document.querySelector('.robot-messages-container');
            if (messagesContainer) {
              const errorMessage = document.createElement('div');
              errorMessage.className = 'robot-error-message';
              errorMessage.style.padding = '10px 15px';
              errorMessage.style.backgroundColor = 'rgba(255, 94, 94, 0.1)';
              errorMessage.style.borderRadius = '10px';
              errorMessage.style.margin = '10px 20px';
              errorMessage.style.maxWidth = '80%';
              errorMessage.style.alignSelf = 'flex-start';
              errorMessage.style.color = '#FF5E5E';
              errorMessage.textContent = `Error: ${errorText}`;
              
              messagesContainer.appendChild(errorMessage);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Reset to neutral after a delay
            setTimeout(() => {
              triggerEmotionAnimation('neutral');
            }, 5000);
          }
        },
        getDiagnostics: () => ({ 
          initialized: true,
          instanceId: result.instanceId,
          timestamp: new Date().toISOString()
        })
      };
      
      // Add visual indication that robot was created successfully
      initializeRobotUI(containerElement, result.instanceId);
      
      console.log('Robot interface created successfully through secure API');
    } catch (createError) {
      console.error('Failed to create robot instance:', createError);
      throw new Error(`Robot creation failed: ${createError.message}`);
    }
    
    // Display initialization diagnostics in debug section
    if (debugSection && window.claudeRobot) {
      updateDebugInfo(window.claudeRobot.getDiagnostics());
    }
    
    // Add text input field below the robot
    createRobotInputInterface(robotContainer);
    
    // Log successful initialization
    console.log('Robot interface initialized successfully');
    if (window.claudeRobot.state.usingFallbacks.overall) {
      console.log(`Using fallbacks: Face: ${window.claudeRobot.state.usingFallbacks.face}, Speech: ${window.claudeRobot.state.usingFallbacks.speech}`);
    }
  } catch (error) {
    console.error('Failed to initialize robot interface:', error);
    
    // Show the error in debug section
    if (debugSection) {
      updateDebugInfo({ error: error.message, errorStack: error.stack });
    }
    
    // Fallback to regular chat interface
    document.getElementById('chat-messages').style.display = 'flex';
    document.getElementById('chat-input-container').style.display = 'flex';
    displayErrorMessage(`Failed to initialize robot interface: ${error.message}. Using standard chat mode instead.`);
  }
}

// Create a debug interface for development mode
function createDebugInterface() {
  const debugSection = document.createElement('div');
  debugSection.className = 'robot-debug-section';
  debugSection.style.padding = '10px';
  debugSection.style.margin = '10px';
  debugSection.style.border = '1px solid #ccc';
  debugSection.style.borderRadius = '5px';
  debugSection.style.backgroundColor = '#f8f8f8';
  debugSection.style.fontSize = '12px';
  debugSection.style.display = 'none'; // Hidden by default
  
  const debugHeader = document.createElement('div');
  debugHeader.innerHTML = '<strong>Debug Information</strong> <button id="toggle-debug">Show</button>';
  debugSection.appendChild(debugHeader);
  
  const debugContent = document.createElement('pre');
  debugContent.id = 'debug-content';
  debugContent.style.maxHeight = '200px';
  debugContent.style.overflow = 'auto';
  debugContent.style.marginTop = '10px';
  debugContent.style.padding = '5px';
  debugContent.style.backgroundColor = '#f0f0f0';
  debugContent.style.display = 'none';
  debugSection.appendChild(debugContent);
  
  // Add the debug section to the page
  setTimeout(() => {
    const toggleBtn = document.getElementById('toggle-debug');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const content = document.getElementById('debug-content');
        if (content.style.display === 'none') {
          content.style.display = 'block';
          toggleBtn.textContent = 'Hide';
        } else {
          content.style.display = 'none';
          toggleBtn.textContent = 'Show';
        }
      });
    }
  }, 100);
  
  return debugSection;
}

// Update debug information display
function updateDebugInfo(info) {
  const debugContent = document.getElementById('debug-content');
  if (debugContent) {
    debugContent.textContent = JSON.stringify(info, null, 2);
  }
}

// Safely determine if we're in dev mode
function isInDevMode() {
  try {
    // Check if window.api exists
    if (!window.api) return false;
    
    // First try the isDev function if it exists
    if (typeof window.api.isDev === 'function') {
      return window.api.isDev();
    }
    
    // Fall back to the async isDevMode method if isDev function is not available
    return false;
  } catch (error) {
    console.error('Error checking dev mode:', error);
    return false;
  }
}

// Feature detection: SVG support
function detectSvgSupport() {
  try {
    return typeof SVGElement !== 'undefined' && 
           document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
  } catch (error) {
    console.error('Error detecting SVG support:', error);
    return false;
  }
}

// Feature detection: Web Speech API support
function detectWebSpeechSupport() {
  try {
    return typeof window !== 'undefined' && 
           'speechSynthesis' in window && 
           'SpeechSynthesisUtterance' in window;
  } catch (error) {
    console.error('Error detecting Web Speech API support:', error);
    return false;
  }
}

// Create a text input interface for the robot
function createRobotInputInterface(container) {
  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'robot-input-container';
  inputContainer.style.display = 'flex';
  inputContainer.style.padding = '16px';
  inputContainer.style.borderTop = '1px solid var(--border-color)';
  
  // Create textarea
  const textarea = document.createElement('textarea');
  textarea.className = 'robot-message-input';
  textarea.placeholder = 'Type a message to Claude...';
  textarea.style.flex = '1';
  textarea.style.padding = '14px 18px';
  textarea.style.borderRadius = '24px';
  textarea.style.border = '1px solid var(--border-color)';
  textarea.style.backgroundColor = 'var(--input-background)';
  textarea.style.color = 'var(--text-color)';
  textarea.style.resize = 'none';
  textarea.style.height = '52px';
  textarea.style.maxHeight = '120px';
  textarea.style.fontSize = '1rem';
  
  // Create send button
  const sendButton = document.createElement('button');
  sendButton.className = 'robot-send-button';
  sendButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  sendButton.style.marginLeft = '12px';
  sendButton.style.height = '52px';
  sendButton.style.width = '52px';
  sendButton.style.borderRadius = '50%';
  sendButton.style.backgroundColor = 'var(--primary-color)';
  sendButton.style.border = 'none';
  sendButton.style.color = 'white';
  sendButton.style.display = 'flex';
  sendButton.style.alignItems = 'center';
  sendButton.style.justifyContent = 'center';
  sendButton.style.cursor = 'pointer';
  
  // Toggle button for robot/chat view
  const toggleButton = document.createElement('button');
  toggleButton.className = 'robot-toggle-button';
  toggleButton.innerHTML = '💬';
  toggleButton.title = 'Switch to chat view';
  toggleButton.style.marginLeft = '12px';
  toggleButton.style.height = '52px';
  toggleButton.style.width = '52px';
  toggleButton.style.borderRadius = '50%';
  toggleButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  toggleButton.style.border = '1px solid var(--border-color)';
  toggleButton.style.color = 'var(--text-color)';
  toggleButton.style.display = 'flex';
  toggleButton.style.alignItems = 'center';
  toggleButton.style.justifyContent = 'center';
  toggleButton.style.cursor = 'pointer';
  
  // Append elements
  inputContainer.appendChild(textarea);
  inputContainer.appendChild(sendButton);
  inputContainer.appendChild(toggleButton);
  container.appendChild(inputContainer);
  
  // Add event listeners
  sendButton.addEventListener('click', () => sendRobotMessage(textarea));
  textarea.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendRobotMessage(textarea);
    }
  });
  
  // Handle toggle between robot and chat view
  toggleButton.addEventListener('click', () => {
    // Disable robot interface and switch back to chat
    localStorage.setItem('robot-interface-enabled', 'false');
    location.reload();
  });
  
  // Function to send message to robot
  function sendRobotMessage(textarea) {
    try {
      const text = textarea.value.trim();
      if (!text) {
        console.warn('Empty message, not sending');
        return;
      }
      
      if (!window.claudeRobot) {
        console.error('Robot interface not initialized');
        displayErrorMessage('Robot interface not properly initialized. Try refreshing the page.');
        return;
      }
      
      // Check if robot is initialized
      if (!window.claudeRobot.state.initialized) {
        console.error('Robot interface not fully initialized');
        displayErrorMessage('Robot interface not fully initialized. Try refreshing the page.');
        return;
      }
      
      // Process user input
      try {
        // Make sure processUserInput function exists
        if (typeof window.claudeRobot.processUserInput === 'function') {
          window.claudeRobot.processUserInput(text);
        } else {
          console.error('processUserInput function not available on claudeRobot object');
          // Fallback direct call
          window.api.robot.processSpeech(text);
        }
      } catch (inputError) {
        console.error('Error processing user input:', inputError);
      }
      
      // Clear textarea
      textarea.value = '';
      
      // Show thinking state
      try {
        // Make sure showThinking function exists
        if (typeof window.claudeRobot.showThinking === 'function') {
          window.claudeRobot.showThinking();
          // Also trigger thinking animation with the new system
          triggerEmotionAnimation('thinking');
        } else {
          console.error('showThinking function not available on claudeRobot object');
          // Fallback direct call
          window.api.robot.showThinking();
        }
      } catch (thinkingError) {
        console.error('Error showing thinking state:', thinkingError);
      }
      
      // Make API call to Claude with timeout for error handling
      const apiTimeout = setTimeout(() => {
        try {
          // Check if function exists
          if (typeof window.claudeRobot.hideThinking === 'function') {
            window.claudeRobot.hideThinking();
          } else {
            window.api.robot.hideThinking();
          }
          
          // Check if showError function exists
          if (typeof window.claudeRobot.showError === 'function') {
            window.claudeRobot.showError('API request timed out. Check your internet connection.');
          } else {
            console.error('API request timed out. Check your internet connection.');
            displayErrorMessage('API request timed out. Check your internet connection.');
          }
        } catch (timeoutHandlingError) {
          console.error('Error handling timeout:', timeoutHandlingError);
        }
      }, 30000); // 30 second timeout
      
      // Make the actual API call
      callClaudeAPI(text).then(response => {
        clearTimeout(apiTimeout);
        try {
          // Check if function exists
          if (typeof window.claudeRobot.hideThinking === 'function') {
            window.claudeRobot.hideThinking();
          } else {
            window.api.robot.hideThinking();
          }
          
          // Check if processClaudeResponse function exists
          if (typeof window.claudeRobot.processClaudeResponse === 'function') {
            window.claudeRobot.processClaudeResponse(response);
          } else {
            console.log('Response received but processClaudeResponse not available:', response.substring(0, 100) + '...');
            
            // Add UI update as fallback
            const containerElement = document.getElementById('robot-interface');
            if (containerElement) {
              const responseElement = document.createElement('div');
              responseElement.className = 'robot-response-fallback';
              responseElement.style.padding = '15px';
              responseElement.style.margin = '15px';
              responseElement.style.backgroundColor = 'rgba(138, 124, 255, 0.1)';
              responseElement.style.borderRadius = '10px';
              responseElement.textContent = response;
              containerElement.appendChild(responseElement);
            }
          }
          
          // Update debug info if in dev mode
          if (isInDevMode() && window.claudeRobot.getDiagnostics) {
            updateDebugInfo(window.claudeRobot.getDiagnostics());
          }
        } catch (responseError) {
          console.error('Error processing Claude response:', responseError);
          window.claudeRobot.showError(`Error processing response: ${responseError.message}`);
        }
      }).catch(error => {
        clearTimeout(apiTimeout);
        console.error('API call failed:', error);
        try {
          // Check if function exists
          if (typeof window.claudeRobot.hideThinking === 'function') {
            window.claudeRobot.hideThinking();
          } else {
            window.api.robot.hideThinking();
          }
          
          // Check if showError function exists
          if (typeof window.claudeRobot.showError === 'function') {
            window.claudeRobot.showError(`API error: ${error.message}`);
          } else {
            console.error('API error:', error.message);
            
            // Add UI update as fallback
            const containerElement = document.getElementById('robot-interface');
            if (containerElement) {
              const errorElement = document.createElement('div');
              errorElement.className = 'robot-error-fallback';
              errorElement.style.padding = '15px';
              errorElement.style.margin = '15px';
              errorElement.style.backgroundColor = 'rgba(255, 94, 94, 0.1)';
              errorElement.style.borderRadius = '10px';
              errorElement.style.color = '#FF5E5E';
              errorElement.textContent = `API error: ${error.message}`;
              containerElement.appendChild(errorElement);
            }
          }
        } catch (errorHandlingError) {
          console.error('Error handling API error:', errorHandlingError);
          displayErrorMessage(`API error: ${error.message}`);
        }
      });
    } catch (error) {
      console.error('Error in sendRobotMessage:', error);
      displayErrorMessage(`Error sending message: ${error.message}`);
    }
  }
  
  // Auto-resize textarea
  textarea.addEventListener('input', function() {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight > 120 ? 120 : textarea.scrollHeight) + 'px';
  });
}

// Load robot styles
function loadRobotStyles() {
  // Load external CSS file
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = 'robot-ui.css';
  document.head.appendChild(cssLink);
  
  // Add animation styles directly for immediate use
  const animationStyles = document.createElement('style');
  animationStyles.textContent = `
    @keyframes blink {
      0%, 90% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    @keyframes speak {
      0% { height: 10px; }
      100% { height: 25px; }
    }
    
    .robot-user-message {
      align-self: flex-end !important;
    }
    
    .robot-claude-message,
    .robot-thinking-indicator,
    .robot-error-message {
      align-self: flex-start !important;
    }
  `;
  document.head.appendChild(animationStyles);
}

// Initialize the enhanced robot UI after successful creation
function initializeRobotUI(containerElement, instanceId) {
  // Clear any existing content
  containerElement.innerHTML = '';
  
  // Add enhanced robot CSS styles
  addRobotStyles();
  
  // Create the robot face visualization with enhanced styling
  const faceContainer = document.createElement('div');
  faceContainer.className = 'robot-face';
  
  // Create robot head with metallic styling
  const robotHead = document.createElement('div');
  robotHead.className = 'robot-head';
  
  // Add head plate details
  const headPlate = document.createElement('div');
  headPlate.className = 'robot-head-plate';
  
  // Add facial features container
  const facialFeatures = document.createElement('div');
  facialFeatures.className = 'robot-facial-features';
  
  // Add eyebrow container
  const eyebrowContainer = document.createElement('div');
  eyebrowContainer.className = 'robot-eyebrow-container';
  
  // Add left and right eyebrows
  const leftEyebrow = document.createElement('div');
  leftEyebrow.className = 'robot-eyebrow left-eyebrow';
  const rightEyebrow = document.createElement('div');
  rightEyebrow.className = 'robot-eyebrow right-eyebrow';
  
  eyebrowContainer.appendChild(leftEyebrow);
  eyebrowContainer.appendChild(rightEyebrow);
  
  // Add eye container
  const eyeContainer = document.createElement('div');
  eyeContainer.className = 'robot-eye-container';
  
  // Add eyes with pupils
  const leftEye = document.createElement('div');
  leftEye.className = 'robot-eye left-eye';
  const leftPupil = document.createElement('div');
  leftPupil.className = 'robot-pupil left-pupil';
  leftEye.appendChild(leftPupil);
  
  const rightEye = document.createElement('div');
  rightEye.className = 'robot-eye right-eye';
  const rightPupil = document.createElement('div');
  rightPupil.className = 'robot-pupil right-pupil';
  rightEye.appendChild(rightPupil);
  
  eyeContainer.appendChild(leftEye);
  eyeContainer.appendChild(rightEye);
  
  // Add nose (optional)
  const nose = document.createElement('div');
  nose.className = 'robot-nose';
  
  // Add mouth with segments for speech animation
  const mouthContainer = document.createElement('div');
  mouthContainer.className = 'robot-mouth-container';
  
  const mouth = document.createElement('div');
  mouth.className = 'robot-mouth';
  
  // Add mouth segments for animation
  for (let i = 0; i < 5; i++) {
    const segment = document.createElement('div');
    segment.className = 'robot-mouth-segment';
    segment.style.animationDelay = `${i * 0.1}s`;
    mouth.appendChild(segment);
  }
  
  mouthContainer.appendChild(mouth);
  
  // Add LED indicator lights
  const indicatorContainer = document.createElement('div');
  indicatorContainer.className = 'robot-indicator-container';
  
  const colors = ['#FF5E5E', '#FFB84D', '#4CAF50', '#5EB3FF'];
  colors.forEach((color, index) => {
    const indicator = document.createElement('div');
    indicator.className = 'robot-indicator';
    indicator.style.backgroundColor = color;
    indicator.style.animationDelay = `${index * 0.5}s`;
    indicatorContainer.appendChild(indicator);
  });
  
  // Add status badge
  const statusBadge = document.createElement('div');
  statusBadge.className = 'robot-status';
  statusBadge.textContent = 'Active';
  
  // Assemble the facial features
  facialFeatures.appendChild(eyebrowContainer);
  facialFeatures.appendChild(eyeContainer);
  facialFeatures.appendChild(nose);
  facialFeatures.appendChild(mouthContainer);
  facialFeatures.appendChild(indicatorContainer);
  facialFeatures.appendChild(statusBadge);
  
  // Assemble the head
  headPlate.appendChild(facialFeatures);
  robotHead.appendChild(headPlate);
  faceContainer.appendChild(robotHead);
  
  // Add instance ID display
  const idDisplay = document.createElement('div');
  idDisplay.className = 'robot-id';
  idDisplay.textContent = `Robot ID: ${instanceId.substring(0, 8)}...`;
  
  // Add a welcome message with speech settings
  const welcomeMessage = document.createElement('div');
  welcomeMessage.className = 'robot-welcome';
  welcomeMessage.innerHTML = `
    <h3>Claude Robot Ready</h3>
    <p>Your advanced robot interface has been initialized and is ready for use.</p>
    <p>The robot will express different emotions based on interactions.</p>
    <div class="speech-settings-container" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(138, 124, 255, 0.2);">
      <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #8A7CFF;">Voice Settings</h4>
      <div class="speech-settings" style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <label for="speech-rate" style="font-size: 12px;">Rate:</label>
          <input type="range" id="speech-rate" min="0.5" max="2" step="0.1" value="1.0" style="width: 70%;">
          <span id="speech-rate-value" style="font-size: 12px; width: 25px; text-align: right;">1.0</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <label for="speech-pitch" style="font-size: 12px;">Pitch:</label>
          <input type="range" id="speech-pitch" min="0.5" max="2" step="0.1" value="1.0" style="width: 70%;">
          <span id="speech-pitch-value" style="font-size: 12px; width: 25px; text-align: right;">1.0</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <label for="speech-volume" style="font-size: 12px;">Volume:</label>
          <input type="range" id="speech-volume" min="0" max="1" step="0.1" value="0.8" style="width: 70%;">
          <span id="speech-volume-value" style="font-size: 12px; width: 25px; text-align: right;">0.8</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 5px;">
          <label for="speech-voice" style="font-size: 12px;">Voice:</label>
          <select id="speech-voice" style="flex-grow: 1; margin-left: 10px; font-size: 12px; padding: 2px;">
            <option value="">Loading voices...</option>
          </select>
        </div>
        <button id="test-speech" style="margin-top: 8px; padding: 5px; background: rgba(138, 124, 255, 0.2); border: 1px solid rgba(138, 124, 255, 0.3); border-radius: 4px; color: #8A7CFF; cursor: pointer;">
          Test Voice
        </button>
      </div>
    </div>
  `;
  
  // Add elements to container
  containerElement.appendChild(faceContainer);
  containerElement.appendChild(idDisplay);
  containerElement.appendChild(welcomeMessage);
  
  // Add speech controls to the robot face
  if (window.speechManager) {
    window.speechManager.attachControlsTo(faceContainer);
  }
  
  // Initialize eye-tracking animation
  initEyeTracking(leftPupil, rightPupil);
  
  // Set up speech controls and settings
  setupSpeechControls(welcomeMessage);
  
  // Trigger a welcome animation
  triggerEmotionAnimation('happy');
  
  // Add automatic blinking
  startBlinking(leftEye, rightEye);
  
  // Return an API to control the robot face expressions
  return {
    showThinking: () => triggerEmotionAnimation('thinking'),
    showSpeaking: () => triggerEmotionAnimation('speaking'),
    showHappy: () => triggerEmotionAnimation('happy'),
    showError: () => triggerEmotionAnimation('error'),
    showConfused: () => triggerEmotionAnimation('confused'),
    showNeutral: () => triggerEmotionAnimation('neutral')
  };
}

// Create SpeechManager class to handle text-to-speech
class SpeechManager {
  constructor(options = {}) {
    // Initialize with default settings or provided options
    this.enabled = options.enabled !== false;
    this.voice = null;
    this.rate = options.rate || 1.0;
    this.pitch = options.pitch || 1.0;
    this.volume = options.volume || 0.8;
    this.voices = [];
    this.voiceURI = options.voiceURI || null;
    this.language = options.language || 'en-US';
    this.onStart = options.onStart || null;
    this.onEnd = options.onEnd || null;
    this.onError = options.onError || null;
    
    // Initialize speech synthesis
    this.initialized = false;
    this.supported = 'speechSynthesis' in window;
    
    // Set up speech synthesis if supported
    if (this.supported) {
      this.initVoices();
      
      // Handle case where voices are loaded asynchronously
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = this.initVoices.bind(this);
      }
      
      this.initialized = true;
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
    
    // Create UI controls
    this.createSpeechControls();
  }
  
  // Initialize available voices
  initVoices() {
    // Get list of available voices
    this.voices = speechSynthesis.getVoices();
    
    // Try to find a preferred voice
    if (this.voiceURI) {
      this.voice = this.voices.find(v => v.voiceURI === this.voiceURI);
    } 
    
    // If no voice was specified or found, try to find one for the preferred language
    if (!this.voice && this.language) {
      // Try to find a voice that matches the language
      this.voice = this.voices.find(v => v.lang === this.language && !v.localService);
      
      // If no remote voice found, try local ones
      if (!this.voice) {
        this.voice = this.voices.find(v => v.lang === this.language);
      }
      
      // If still no voice, try to find one that starts with the language code
      if (!this.voice) {
        const langPrefix = this.language.split('-')[0];
        this.voice = this.voices.find(v => v.lang.startsWith(langPrefix) && !v.localService);
        
        // If no remote voice found, try local ones
        if (!this.voice) {
          this.voice = this.voices.find(v => v.lang.startsWith(langPrefix));
        }
      }
    }
    
    // If still no voice, use the first available
    if (!this.voice && this.voices.length > 0) {
      this.voice = this.voices[0];
    }
  }
  
  // Create UI controls for speech settings
  createSpeechControls() {
    const controls = document.createElement('div');
    controls.className = 'speech-controls';
    controls.style.position = 'absolute';
    controls.style.top = '10px';
    controls.style.left = '10px';
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.zIndex = '100';
    
    // Add toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'speech-toggle';
    toggleButton.innerHTML = this.enabled ? '🔊' : '🔇';
    toggleButton.title = this.enabled ? 'Mute' : 'Unmute';
    toggleButton.style.width = '32px';
    toggleButton.style.height = '32px';
    toggleButton.style.borderRadius = '50%';
    toggleButton.style.border = 'none';
    toggleButton.style.background = 'rgba(138, 124, 255, 0.2)';
    toggleButton.style.color = '#8A7CFF';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.display = 'flex';
    toggleButton.style.alignItems = 'center';
    toggleButton.style.justifyContent = 'center';
    toggleButton.style.fontSize = '16px';
    toggleButton.style.transition = 'all 0.2s ease';
    
    // Add event listener to toggle button
    toggleButton.addEventListener('click', () => {
      this.enabled = !this.enabled;
      toggleButton.innerHTML = this.enabled ? '🔊' : '🔇';
      toggleButton.title = this.enabled ? 'Mute' : 'Unmute';
      
      // Save preference
      localStorage.setItem('speech-enabled', this.enabled.toString());
      
      // Cancel current speech if turning off
      if (!this.enabled) {
        this.cancel();
      }
    });
    
    // Add controls container to robot interface
    controls.appendChild(toggleButton);
    
    // Store reference for later use
    this.controlsElement = controls;
    this.toggleButton = toggleButton;
    
    // Load saved preference
    const savedPreference = localStorage.getItem('speech-enabled');
    if (savedPreference !== null) {
      this.enabled = savedPreference === 'true';
      toggleButton.innerHTML = this.enabled ? '🔊' : '🔇';
      toggleButton.title = this.enabled ? 'Mute' : 'Unmute';
    }
  }
  
  // Add speech controls to a container
  attachControlsTo(container) {
    if (container && this.controlsElement) {
      container.appendChild(this.controlsElement);
    }
  }
  
  // Speak a text
  speak(text, options = {}) {
    // Return early if speech is not supported or disabled
    if (!this.supported || !this.enabled) {
      if (options.onEnd) options.onEnd();
      return false;
    }
    
    // Cancel any ongoing speech
    this.cancel();
    
    // Handle empty or invalid text
    if (!text || typeof text !== 'string' || !text.trim()) {
      if (options.onEnd) options.onEnd();
      return false;
    }
    
    // Prepare text for speaking (clean and process for better speech)
    const processedText = this.processTextForSpeech(text);
    
    // Create utterance with processed text
    const utterance = new SpeechSynthesisUtterance(processedText);
    
    // Set utterance properties
    utterance.voice = options.voice || this.voice;
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;
    utterance.volume = options.volume || this.volume;
    utterance.lang = options.language || this.language;
    
    // Set up event handlers
    utterance.onstart = () => {
      if (this.onStart) this.onStart();
      if (options.onStart) options.onStart();
    };
    
    utterance.onend = () => {
      if (this.onEnd) this.onEnd();
      if (options.onEnd) options.onEnd();
    };
    
    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      if (this.onError) this.onError(error);
      if (options.onError) options.onError(error);
    };
    
    // Start speaking
    speechSynthesis.speak(utterance);
    
    return true;
  }
  
  // Process text to make it more suitable for speech
  processTextForSpeech(text) {
    // Remove Markdown formatting that doesn't make sense in speech
    let processed = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers
      .replace(/`(.*?)`/g, '$1')       // Remove inline code markers
      .replace(/```(.*?)```/gs, '$1')  // Remove code block markers
      
      // Replace common symbols with their spoken equivalents
      .replace(/&/g, ' and ')
      .replace(/\//g, ' or ')
      .replace(/-/g, ' ')
      .replace(/\n/g, '. ')           // Replace newlines with pauses
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\.\s*\./g, '.')       // Fix multiple periods
      .replace(/\s+\./g, '.')         // Fix spaces before periods
      .trim();
    
    // Break long text into sentences for better speech flow
    const sentences = processed.split(/[.!?]+/);
    return sentences.filter(s => s.trim().length > 0).join('. ');
  }
  
  // Cancel current speech
  cancel() {
    if (this.supported) {
      speechSynthesis.cancel();
    }
  }
  
  // Pause current speech
  pause() {
    if (this.supported) {
      speechSynthesis.pause();
    }
  }
  
  // Resume paused speech
  resume() {
    if (this.supported) {
      speechSynthesis.resume();
    }
  }
  
  // Check if speaking
  isSpeaking() {
    return this.supported && speechSynthesis.speaking;
  }
  
  // Get list of available voices
  getVoices() {
    return this.voices;
  }
  
  // Set voice by URI
  setVoice(voiceURI) {
    if (!this.supported) return false;
    
    const voice = this.voices.find(v => v.voiceURI === voiceURI);
    if (voice) {
      this.voice = voice;
      return true;
    }
    
    return false;
  }
}

// Add robot-specific styles
function addRobotStyles() {
  // Check if styles already exist
  if (document.getElementById('robot-enhanced-styles')) return;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = 'robot-enhanced-styles';
  styleSheet.innerHTML = `
    /* Robot Face Styling */
    .robot-face {
      width: 280px;
      height: 320px;
      margin: 20px auto;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .robot-head {
      width: 260px;
      height: 300px;
      background: linear-gradient(135deg, #2a2f3b 0%, #1a1d24 100%);
      border-radius: 50% 50% 45% 45%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3),
                  inset 0 2px 10px rgba(255, 255, 255, 0.2),
                  inset 0 -2px 10px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      z-index: 1;
      border: 2px solid #3f434d;
    }
    
    .robot-head:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 40%;
      background: linear-gradient(180deg, rgba(70, 76, 95, 0.3) 0%, rgba(70, 76, 95, 0) 100%);
      border-radius: 50% 50% 0 0;
      z-index: -1;
    }
    
    .robot-head-plate {
      width: 220px;
      height: 260px;
      background: linear-gradient(135deg, #2e3341 0%, #1e2128 100%);
      border-radius: 45% 45% 40% 40%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
    }
    
    .robot-facial-features {
      width: 180px;
      height: 220px;
      position: relative;
    }
    
    /* Eyebrows */
    .robot-eyebrow-container {
      position: absolute;
      top: 30px;
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 10px;
    }
    
    .robot-eyebrow {
      width: 60px;
      height: 8px;
      background: #8A7CFF;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }
    
    /* Eyes */
    .robot-eye-container {
      position: absolute;
      top: 50px;
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 15px;
    }
    
    .robot-eye {
      width: 56px;
      height: 56px;
      background: #2d303a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2),
                  inset 0 2px 5px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
    }
    
    .robot-eye:before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      width: 80%;
      height: 50%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%);
      border-radius: 50% 50% 0 0;
    }
    
    .robot-pupil {
      width: 30px;
      height: 30px;
      background: #8A7CFF;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(138, 124, 255, 0.7);
      position: relative;
      transition: all 0.2s ease;
    }
    
    .robot-pupil:after {
      content: '';
      position: absolute;
      top: 20%;
      left: 20%;
      width: 35%;
      height: 35%;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
    }
    
    /* Nose */
    .robot-nose {
      position: absolute;
      top: 115px;
      left: 50%;
      transform: translateX(-50%);
      width: 15px;
      height: 10px;
      background: #3d4050;
      border-radius: 30% 30% 50% 50%;
      box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.3);
    }
    
    /* Mouth */
    .robot-mouth-container {
      position: absolute;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 30px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .robot-mouth {
      width: 90px;
      height: 25px;
      background: #1e2128;
      border-radius: 8px;
      display: flex;
      justify-content: space-evenly;
      align-items: center;
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.7);
      transition: all 0.3s ease;
    }
    
    .robot-mouth-segment {
      width: 4px;
      height: 15px;
      background: #8A7CFF;
      border-radius: 3px;
      box-shadow: 0 0 5px rgba(138, 124, 255, 0.5);
      animation: soundWave 0.5s infinite alternate;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    /* Indicators */
    .robot-indicator-container {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      display: flex;
      justify-content: space-between;
    }
    
    .robot-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      box-shadow: 0 0 8px currentColor;
      animation: pulse 2s infinite alternate;
    }
    
    /* Status Badge */
    .robot-status {
      position: absolute;
      top: 10px;
      right: 0;
      background: #4CAF50;
      color: white;
      padding: 5px 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: bold;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }
    
    /* ID and Welcome message */
    .robot-id {
      text-align: center;
      font-size: 12px;
      color: #888;
      margin-top: 10px;
      font-family: monospace;
      letter-spacing: 0.5px;
    }
    
    .robot-welcome {
      padding: 20px;
      background: rgba(138, 124, 255, 0.1);
      border-radius: 10px;
      margin: 20px;
      text-align: center;
      border: 1px solid rgba(138, 124, 255, 0.3);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    
    .robot-welcome h3 {
      margin-top: 0;
      color: #8A7CFF;
    }
    
    /* Animations */
    @keyframes blink {
      0%, 45%, 100% { transform: scaleY(1); }
      50%, 95% { transform: scaleY(0.1); }
    }
    
    @keyframes soundWave {
      0% { height: 5px; }
      100% { height: 15px; }
    }
    
    @keyframes pulse {
      0% { opacity: 0.6; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }
    
    @keyframes thinking {
      0% { background: #8A7CFF; }
      50% { background: #FFB84D; }
      100% { background: #8A7CFF; }
    }
    
    /* Emotion States */
    .robot-face[data-emotion="speaking"] .robot-mouth-segment {
      opacity: 1;
    }
    
    .robot-face[data-emotion="happy"] .robot-eyebrow {
      transform: translateY(-5px) rotate(0deg);
    }
    
    .robot-face[data-emotion="happy"] .robot-mouth {
      height: 30px;
      border-radius: 15px 15px 8px 8px;
    }
    
    .robot-face[data-emotion="thinking"] .robot-eyebrow.left-eyebrow {
      transform: translateY(-5px) rotate(15deg);
    }
    
    .robot-face[data-emotion="thinking"] .robot-eyebrow.right-eyebrow {
      transform: translateY(-5px) rotate(-15deg);
    }
    
    .robot-face[data-emotion="thinking"] .robot-pupil {
      animation: thinking 2s infinite;
    }
    
    .robot-face[data-emotion="error"] .robot-eyebrow.left-eyebrow {
      transform: translateY(5px) rotate(-15deg);
    }
    
    .robot-face[data-emotion="error"] .robot-eyebrow.right-eyebrow {
      transform: translateY(5px) rotate(15deg);
    }
    
    .robot-face[data-emotion="error"] .robot-mouth {
      height: 15px;
      border-radius: 8px 8px 15px 15px;
      transform: translateY(5px);
    }
    
    .robot-face[data-emotion="error"] .robot-pupil {
      background: #FF5E5E;
      box-shadow: 0 0 10px rgba(255, 94, 94, 0.7);
    }
    
    .robot-face[data-emotion="confused"] .robot-eyebrow.left-eyebrow {
      transform: translateY(-8px) rotate(20deg);
    }
    
    .robot-face[data-emotion="confused"] .robot-eyebrow.right-eyebrow {
      transform: translateY(3px) rotate(-5deg);
    }
  `;
  
  document.head.appendChild(styleSheet);
}

// Initialize eye tracking
function initEyeTracking(leftPupil, rightPupil) {
  const maxMovement = 8; // Maximum movement in pixels
  
  // Track mouse movement for eye following
  document.addEventListener('mousemove', (e) => {
    // Get page dimensions
    const pageWidth = document.body.clientWidth;
    const pageHeight = document.body.clientHeight;
    
    // Calculate horizontal and vertical position percentages
    const xPercent = e.pageX / pageWidth;
    const yPercent = e.pageY / pageHeight;
    
    // Calculate eye movement
    const xMovement = (xPercent - 0.5) * maxMovement * 2;
    const yMovement = (yPercent - 0.5) * maxMovement * 2;
    
    // Apply transformation to pupils
    leftPupil.style.transform = `translate(${xMovement}px, ${yMovement}px)`;
    rightPupil.style.transform = `translate(${xMovement}px, ${yMovement}px)`;
  });
  
  // Reset eyes position when mouse leaves window
  document.addEventListener('mouseleave', () => {
    leftPupil.style.transform = 'translate(0, 0)';
    rightPupil.style.transform = 'translate(0, 0)';
  });
}

// Start automatic blinking
function startBlinking(leftEye, rightEye) {
  const blinkAnimation = () => {
    // Add blink animation to both eyes
    leftEye.style.animation = 'blink 0.2s ease-in-out';
    rightEye.style.animation = 'blink 0.2s ease-in-out';
    
    // Remove animation after it completes to allow it to play again
    setTimeout(() => {
      leftEye.style.animation = '';
      rightEye.style.animation = '';
    }, 200);
  };
  
  // Initial blink
  setTimeout(blinkAnimation, 1000);
  
  // Set up periodic blinking
  setInterval(() => {
    // Random delay for natural feel
    const randomDelay = Math.random() * 1000;
    setTimeout(blinkAnimation, randomDelay);
  }, 5000);
}

// Set up speech controls and event handlers
function setupSpeechControls(containerElement) {
  if (!window.speechManager || !containerElement) return;
  
  // Get control elements
  const rateSlider = containerElement.querySelector('#speech-rate');
  const rateValue = containerElement.querySelector('#speech-rate-value');
  const pitchSlider = containerElement.querySelector('#speech-pitch');
  const pitchValue = containerElement.querySelector('#speech-pitch-value');
  const volumeSlider = containerElement.querySelector('#speech-volume');
  const volumeValue = containerElement.querySelector('#speech-volume-value');
  const voiceSelect = containerElement.querySelector('#speech-voice');
  const testButton = containerElement.querySelector('#test-speech');
  
  // Set initial values
  if (rateSlider && rateValue) {
    rateSlider.value = window.speechManager.rate;
    rateValue.textContent = window.speechManager.rate.toFixed(1);
  }
  
  if (pitchSlider && pitchValue) {
    pitchSlider.value = window.speechManager.pitch;
    pitchValue.textContent = window.speechManager.pitch.toFixed(1);
  }
  
  if (volumeSlider && volumeValue) {
    volumeSlider.value = window.speechManager.volume;
    volumeValue.textContent = window.speechManager.volume.toFixed(1);
  }
  
  // Populate voice options when voices are available
  function populateVoiceList() {
    if (!voiceSelect) return;
    
    // Clear existing options
    voiceSelect.innerHTML = '';
    
    // Get voices from speech manager
    const voices = window.speechManager.getVoices();
    
    if (voices.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'No voices available';
      option.value = '';
      voiceSelect.appendChild(option);
      return;
    }
    
    // Group voices by language
    const voicesByLang = {};
    voices.forEach(voice => {
      const lang = voice.lang || 'unknown';
      if (!voicesByLang[lang]) {
        voicesByLang[lang] = [];
      }
      voicesByLang[lang].push(voice);
    });
    
    // Create option groups for each language
    Object.keys(voicesByLang).sort().forEach(lang => {
      const langVoices = voicesByLang[lang];
      
      // Create option group
      const group = document.createElement('optgroup');
      group.label = lang;
      
      // Add voices to group
      langVoices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = voice.name + (voice.localService ? ' (local)' : ' (network)');
        option.value = voice.voiceURI;
        
        // Select current voice
        if (window.speechManager.voice && voice.voiceURI === window.speechManager.voice.voiceURI) {
          option.selected = true;
        }
        
        group.appendChild(option);
      });
      
      voiceSelect.appendChild(group);
    });
    
    // If no voice is selected but we have voices, select the first one
    if (!voiceSelect.value && voices.length > 0) {
      voiceSelect.value = voices[0].voiceURI;
    }
  }
  
  // Try to populate voice list immediately
  populateVoiceList();
  
  // Update when voices change
  if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
  }
  
  // Add event listeners for controls
  if (rateSlider && rateValue) {
    rateSlider.addEventListener('input', function() {
      const value = parseFloat(this.value);
      rateValue.textContent = value.toFixed(1);
      window.speechManager.rate = value;
      
      // Save setting
      localStorage.setItem('speech-rate', value);
    });
  }
  
  if (pitchSlider && pitchValue) {
    pitchSlider.addEventListener('input', function() {
      const value = parseFloat(this.value);
      pitchValue.textContent = value.toFixed(1);
      window.speechManager.pitch = value;
      
      // Save setting
      localStorage.setItem('speech-pitch', value);
    });
  }
  
  if (volumeSlider && volumeValue) {
    volumeSlider.addEventListener('input', function() {
      const value = parseFloat(this.value);
      volumeValue.textContent = value.toFixed(1);
      window.speechManager.volume = value;
      
      // Save setting
      localStorage.setItem('speech-volume', value);
    });
  }
  
  if (voiceSelect) {
    voiceSelect.addEventListener('change', function() {
      const voiceURI = this.value;
      if (voiceURI) {
        window.speechManager.setVoice(voiceURI);
        
        // Save setting
        localStorage.setItem('speech-voice', voiceURI);
      }
    });
  }
  
  if (testButton) {
    testButton.addEventListener('click', function() {
      const testText = "Hello! I'm Claude, an AI assistant. How can I help you today?";
      
      // Disable button during test
      this.disabled = true;
      this.textContent = 'Speaking...';
      
      // Trigger speaking animation
      triggerEmotionAnimation('speaking');
      
      // Speak test message
      window.speechManager.speak(testText, {
        onEnd: () => {
          // Re-enable button when done
          this.disabled = false;
          this.textContent = 'Test Voice';
          
          // Reset animation
          triggerEmotionAnimation('happy');
        },
        onError: () => {
          // Handle errors
          this.disabled = false;
          this.textContent = 'Test Failed';
          
          // Reset animation
          triggerEmotionAnimation('error');
          
          // Reset button text after a delay
          setTimeout(() => {
            this.textContent = 'Test Voice';
            triggerEmotionAnimation('neutral');
          }, 2000);
        }
      });
    });
  }
  
  // Load saved settings
  const savedRate = localStorage.getItem('speech-rate');
  const savedPitch = localStorage.getItem('speech-pitch');
  const savedVolume = localStorage.getItem('speech-volume');
  const savedVoice = localStorage.getItem('speech-voice');
  
  if (savedRate !== null && rateSlider && rateValue) {
    const rate = parseFloat(savedRate);
    rateSlider.value = rate;
    rateValue.textContent = rate.toFixed(1);
    window.speechManager.rate = rate;
  }
  
  if (savedPitch !== null && pitchSlider && pitchValue) {
    const pitch = parseFloat(savedPitch);
    pitchSlider.value = pitch;
    pitchValue.textContent = pitch.toFixed(1);
    window.speechManager.pitch = pitch;
  }
  
  if (savedVolume !== null && volumeSlider && volumeValue) {
    const volume = parseFloat(savedVolume);
    volumeSlider.value = volume;
    volumeValue.textContent = volume.toFixed(1);
    window.speechManager.volume = volume;
  }
  
  if (savedVoice !== null && voiceSelect) {
    // Voice selection will be handled when the voices are loaded
    window.speechManager.voiceURI = savedVoice;
  }
}

// Trigger emotion animations
function triggerEmotionAnimation(emotion) {
  const robotFace = document.querySelector('.robot-face');
  if (!robotFace) return;
  
  // Set emotion data attribute to trigger CSS animations
  robotFace.setAttribute('data-emotion', emotion);
  
  // Special handling for speaking animation
  if (emotion === 'speaking') {
    // Activate mouth segments
    const segments = robotFace.querySelectorAll('.robot-mouth-segment');
    segments.forEach(segment => {
      segment.style.opacity = '1';
    });
    
    // Setup auto-reset for speaking after a delay
    setTimeout(() => {
      if (robotFace.getAttribute('data-emotion') === 'speaking') {
        segments.forEach(segment => {
          segment.style.opacity = '0';
        });
        robotFace.setAttribute('data-emotion', 'neutral');
      }
    }, 5000);
  }
}

// Make API call to Claude
async function callClaudeAPI(userMessage) {
  if (!apiKey) {
    throw new Error('API key is not set');
  }
  
  if (!navigator.onLine) {
    throw new Error('You are offline. Cannot send messages.');
  }
  
  try {
    // Create messages array for API (only user and assistant messages)
    let messagesForAPI = [];
    
    // Add user message (the only message in this simple case)
    messagesForAPI.push({
      role: 'user',
      content: userMessage
    });
    
    // Prepare request payload
    const requestPayload = {
      model: appConfig.model || 'claude-3-haiku-20240307',
      max_tokens: appConfig.maxTokens || 1024,
      temperature: appConfig.temperature || 0.7,
      messages: messagesForAPI
    };
    
    // Add system as a top-level parameter if configured, not as a message
    if (appConfig.systemPrompt) {
      requestPayload.system = appConfig.systemPrompt;
    }
    
    // Log the payload for debugging
    const isDevModeActive = isInDevMode();
    if (isDevModeActive) {
      console.log('Claude API payload:', JSON.stringify(requestPayload, null, 2));
    }
    
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestPayload)
    });
    
    if (!response.ok) {
      // Get detailed error information
      const errorData = await response.json();
      console.error('Claude API error response:', errorData);
      throw new Error(errorData.error?.message || 'Failed to get response from Claude');
    }
    
    const data = await response.json();
    return data.content[0].text;
    
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

// Set up event listeners with proper cleanup registration
function setupEventListeners() {
  // Helper to safely add event listener with cleanup registration
  function addListener(element, event, handler) {
    if (!element) {
      console.warn(`Element not found for event: ${event}`);
      return;
    }
    
    element.addEventListener(event, handler);
    registerCleanup(() => element.removeEventListener(event, handler));
  }
  
  // Send message on button click or Enter key
  addListener(sendButton, 'click', sendMessage);
  
  const keyPressHandler = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    
    // Resize textarea as content grows
    resizeTextarea();
  };
  addListener(messageInput, 'keypress', keyPressHandler);
  
  const inputHandler = () => resizeTextarea();
  addListener(messageInput, 'input', inputHandler);
  
  // Settings modal functionality
  closeButtons.forEach(button => {
    addListener(button, 'click', () => {
      settingsModal.classList.add('hidden');
    });
  });
  
  // API key functionality
  addListener(saveApiKeyButton, 'click', saveApiKey);
  
  addListener(apiKeyLink, 'click', (e) => {
    e.preventDefault();
    // Use electron's shell to open external URLs
    alert('Please visit: https://console.anthropic.com/ to get your API key');
  });
  
  // Update functionality
  addListener(installUpdateButton, 'click', () => {
    // Signal the main process to install update
    displaySystemMessage('Installing update, application will restart...');
    updateModal.classList.add('hidden');
  });
  
  addListener(skipUpdateButton, 'click', () => {
    updateModal.classList.add('hidden');
  });
  
  // App control buttons (settings and config)
  addListener(settingsButton, 'click', () => {
    console.log('Settings button clicked');
    showSettingsModal();
  });
  
  addListener(configButton, 'click', () => {
    console.log('Config button clicked');
    showConfigModal();
  });

  // Window control buttons
  addListener(minimizeButton, 'click', () => {
    window.api.minimizeWindow();
  });
  
  addListener(maximizeButton, 'click', () => {
    window.api.maximizeWindow();
  });
  
  addListener(closeButton, 'click', () => {
    window.api.closeWindow();
  });
  
  // Configuration modal
  addListener(closeConfigButton, 'click', () => {
    configModal.classList.add('hidden');
  });
  
  // Temperature slider
  addListener(temperatureSlider, 'input', () => {
    temperatureValue.textContent = temperatureSlider.value;
  });
  
  // Save and reset configuration
  addListener(saveConfigButton, 'click', saveConfiguration);
  addListener(resetConfigButton, 'click', resetConfiguration);
  
  // Event listeners from main process with cleanup
  const clearHistoryCleanup = window.api.onClearHistory(() => {
    clearHistory();
  });
  registerCleanup(clearHistoryCleanup);
  
  const openSettingsCleanup = window.api.onOpenSettings(() => {
    showSettingsModal();
  });
  registerCleanup(openSettingsCleanup);
  
  const openConfigCleanup = window.api.onOpenConfig(() => {
    showConfigModal();
  });
  registerCleanup(openConfigCleanup);
  
  // Network status monitoring
  const onlineHandler = () => handleNetworkChange();
  const offlineHandler = () => handleNetworkChange();
  
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);
  
  registerCleanup(() => {
    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
  });
  
  // Log successful event registration
  if (window.api && window.api.logger) {
    window.api.logger.debug('Event listeners registered successfully');
  }
}

// Send a message to Claude
async function sendMessage() {
  const userMessage = messageInput.value.trim();
  
  // Don't send empty messages
  if (!userMessage || isWaitingForResponse) return;
  
  // Check if API key exists
  if (!apiKey) {
    displayErrorMessage('Please set your API key in Settings first.');
    showSettingsModal();
    return;
  }
  
  // Check if online
  if (!isOnline) {
    displayErrorMessage('You are offline. Cannot send messages.');
    return;
  }
  
  // Clear input and show thinking indicator
  messageInput.value = '';
  resizeTextarea();
  
  // Add user message to UI
  displayUserMessage(userMessage);
  
  // Create messages array for API (only user and assistant messages)
  let messagesForAPI = [];
  
  // Add message history (filtering out any system messages)
  messageHistory.forEach(msg => {
    if (msg.role !== 'system') {
      messagesForAPI.push(msg);
    }
  });
  
  // Add current user message to messages array
  messagesForAPI.push({
    role: 'user',
    content: userMessage
  });
  
  // Add current message to history
  messageHistory.push({
    role: 'user',
    content: userMessage
  });
  
  // Save message history
  await window.api.saveMessageHistory(messageHistory);
  
  // Show thinking indicator
  thinkingIndicator.classList.remove('hidden');
  isWaitingForResponse = true;
  sendButton.disabled = true;
  
  try {
    // Prepare request payload with system as top-level parameter
    const requestPayload = {
      model: appConfig.model,
      max_tokens: appConfig.maxTokens,
      temperature: appConfig.temperature,
      messages: messagesForAPI
    };
    
    // Add system as a top-level parameter if configured
    if (appConfig.systemPrompt) {
      requestPayload.system = appConfig.systemPrompt;
    }
    
    // Log the payload for debugging
    console.log('Claude API payload for chat interface:', JSON.stringify(requestPayload, null, 2));
    
    // Call Claude API with current configuration
    const response = await fetch(CLAUDE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION
      },
      body: JSON.stringify(requestPayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to get response from Claude');
    }
    
    const data = await response.json();
    const assistantMessage = data.content[0].text;
    
    // Add Claude's response to UI
    displayAssistantMessage(assistantMessage);
    
    // Add to history
    messageHistory.push({
      role: 'assistant',
      content: assistantMessage
    });
    
    // Trim history if too long
    if (messageHistory.length > appConfig.maxHistoryLength * 2) { // *2 because each exchange is two messages
      messageHistory = messageHistory.slice(-appConfig.maxHistoryLength * 2);
    }
    
    // Save message history
    await window.api.saveMessageHistory(messageHistory);
    
  } catch (error) {
    console.error('Error calling Claude API:', error);
    displayErrorMessage(`Error: ${error.message}`);
  } finally {
    // Hide thinking indicator
    thinkingIndicator.classList.add('hidden');
    isWaitingForResponse = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
}

// Display a user message in the chat
function displayUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message user';
  messageElement.textContent = message;
  
  const infoElement = document.createElement('div');
  infoElement.className = 'message-info';
  infoElement.textContent = getCurrentTime();
  
  chatMessages.appendChild(messageElement);
  messageElement.appendChild(infoElement);
  scrollToBottom();
}

// Display an assistant message in the chat
function displayAssistantMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message assistant';
  
  // Replace markdown with HTML elements (consider using marked library for more complex markdown)
  const formattedMessage = message
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')  // Italic
    .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')  // Code blocks
    .replace(/`(.*?)`/g, '<code>$1</code>')  // Inline code
    .replace(/\n/g, '<br>');  // Line breaks
  
  messageElement.innerHTML = formattedMessage;
  
  const infoElement = document.createElement('div');
  infoElement.className = 'message-info';
  infoElement.textContent = getCurrentTime();
  
  chatMessages.appendChild(messageElement);
  messageElement.appendChild(infoElement);
  scrollToBottom();
}

// Display a system message
function displaySystemMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message system';
  messageElement.textContent = message;
  
  chatMessages.appendChild(messageElement);
  scrollToBottom();
}

// Display an error message
function displayErrorMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message error';
  messageElement.textContent = message;
  
  chatMessages.appendChild(messageElement);
  scrollToBottom();
}

// Render the message history
function renderMessageHistory() {
  // Clear the chat messages
  chatMessages.innerHTML = '';
  
  // Display system welcome message
  displaySystemMessage('Welcome back to Claude Desktop!');
  
  // Display each message
  messageHistory.forEach(message => {
    if (message.role === 'user') {
      displayUserMessage(message.content);
    } else if (message.role === 'assistant') {
      displayAssistantMessage(message.content);
    }
  });
}

// Clear the chat history
function clearHistory() {
  messageHistory = [];
  chatMessages.innerHTML = '';
  window.api.saveMessageHistory([]);
  displaySystemMessage('Chat history cleared.');
}

// Save the API key
async function saveApiKey() {
  const newApiKey = apiKeyInput.value.trim();
  
  if (!newApiKey) {
    alert('Please enter a valid API key.');
    return;
  }
  
  // Save the API key
  const result = await window.api.saveApiKey(newApiKey);
  
  if (result.success) {
    apiKey = newApiKey;
    settingsModal.classList.add('hidden');
    
    // Provide feedback about storage method
    if (result.keychainWorked) {
      displaySystemMessage('API key saved securely using system keychain.');
    } else if (result.storeWorked) {
      displaySystemMessage('API key saved using encrypted local storage (system keychain unavailable).');
    } else {
      displaySystemMessage('API key saved successfully.');
    }
  } else {
    // Detailed error feedback
    let errorMessage = 'Failed to save API key.';
    
    if (platformInfo && platformInfo.isWSL) {
      errorMessage = 'Failed to save API key in WSL environment. The system keychain service may be unavailable. Try running the app in Windows directly.';
    } else if (platformInfo && platformInfo.isLinux) {
      errorMessage = 'Failed to save API key. On Linux, you may need to install a keyring service like "gnome-keyring" or "libsecret".';
    } else if (result.error) {
      errorMessage = `Failed to save API key: ${result.error}`;
    }
    
    alert(errorMessage);
  }
}

// Show the settings modal
function showSettingsModal() {
  console.log('Opening settings modal');
  
  // Pre-fill existing API key if it exists
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
  
  settingsModal.classList.remove('hidden');
  apiKeyInput.focus();
}

// Show the configuration modal
function showConfigModal() {
  console.log('Opening configuration modal');
  
  // Ensure config UI is up to date
  updateConfigUI();
  
  configModal.classList.remove('hidden');
}

// Update configuration UI with current values
function updateConfigUI() {
  if (!appConfig) return;
  
  // Set values in form elements
  modelSelect.value = appConfig.model;
  maxTokensInput.value = appConfig.maxTokens;
  temperatureSlider.value = appConfig.temperature;
  temperatureValue.textContent = appConfig.temperature;
  maxHistoryInput.value = appConfig.maxHistoryLength;
  themeSelect.value = appConfig.theme;
  fontSizeSelect.value = appConfig.fontSize;
  systemPromptInput.value = appConfig.systemPrompt || '';
  
  // Set interface mode based on localStorage value
  interfaceModeSelect.value = localStorage.getItem('robot-interface-enabled') === 'true' ? 'robot' : 'chat';
}

// Save configuration changes
async function saveConfiguration() {
  // Get values from form elements
  const newConfig = {
    model: modelSelect.value,
    maxTokens: parseInt(maxTokensInput.value),
    temperature: parseFloat(temperatureSlider.value),
    maxHistoryLength: parseInt(maxHistoryInput.value),
    theme: themeSelect.value,
    fontSize: fontSizeSelect.value,
    systemPrompt: systemPromptInput.value
  };
  
  // Handle interface mode (stored in localStorage)
  const newInterfaceMode = interfaceModeSelect.value === 'robot';
  const currentInterfaceMode = localStorage.getItem('robot-interface-enabled') === 'true';
  
  // Set interface mode in localStorage
  localStorage.setItem('robot-interface-enabled', newInterfaceMode);
  
  // Save to store
  const success = await window.api.saveConfig(newConfig);
  
  if (success) {
    // Update application state
    appConfig = newConfig;
    
    // Apply appearance settings
    applyAppearanceSettings();
    
    // Hide modal
    configModal.classList.add('hidden');
    
    // Show confirmation
    displaySystemMessage('Configuration saved successfully.');
    
    // If interface mode changed, reload the app
    if (newInterfaceMode !== currentInterfaceMode) {
      displaySystemMessage('Interface mode changed. Reloading application...');
      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } else {
    displayErrorMessage('Failed to save configuration.');
  }
}

// Reset configuration to defaults
async function resetConfiguration() {
  if (confirm('Reset all settings to default values?')) {
    appConfig = await window.api.resetConfig();
    
    // Update UI
    updateConfigUI();
    
    // Apply appearance settings
    applyAppearanceSettings();
    
    displaySystemMessage('Configuration reset to default values.');
  }
}

// Apply theme and font size settings
function applyAppearanceSettings() {
  if (!appConfig) return;
  
  // Apply font size
  document.documentElement.setAttribute('data-font-size', appConfig.fontSize);
  
  // Apply theme (if you implement light theme later)
  document.documentElement.setAttribute('data-theme', appConfig.theme);
}

// Handle network status changes
function handleNetworkChange() {
  checkNetworkStatus();
}

// Check the network status
async function checkNetworkStatus() {
  isOnline = navigator.onLine;
  
  if (isOnline) {
    offlineIndicator.classList.add('hidden');
  } else {
    offlineIndicator.classList.remove('hidden');
    displaySystemMessage('You are currently offline. Some features may not be available.');
  }
}

// Resize the textarea as content grows
function resizeTextarea() {
  messageInput.style.height = 'auto';
  messageInput.style.height = (messageInput.scrollHeight > 120 ? 120 : messageInput.scrollHeight) + 'px';
}

// Scroll to the bottom of the chat
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Get the current time formatted as HH:MM
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);