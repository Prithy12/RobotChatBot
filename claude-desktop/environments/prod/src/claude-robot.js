/**
 * Claude Robot Interface
 * 
 * Integrates the robot face animation, text-to-speech, and sentiment analysis
 * with the Claude API functionality.
 * Includes comprehensive error handling and detailed diagnostics.
 * 
 * Enhanced with advanced logging for troubleshooting initialization issues.
 */

// Import components
const RobotFace = require('./robot-face');
const SpeechManager = require('./speech-manager');
const SentimentAnalyzer = require('./sentiment-analyzer');

// File and asset paths - for improved path resolution
const path = require('path');

// Logger for tracking initialization and runtime issues
// Will be connected to the application-wide logging system if available
let electronLogger = null;

// Try to get the Electron logger if we're in an Electron environment
try {
  if (typeof window !== 'undefined' && window.api && window.api.logger) {
    electronLogger = window.api.logger;
  }
} catch (error) {
  console.error("Could not access Electron logger:", error);
}

// Create a robust logger that outputs to both console and electron logger if available
const robotLogger = {
  debug: (message, ...args) => {
    console.log(`[ClaudeRobot][DEBUG] ${message}`, ...args);
    if (electronLogger) electronLogger.debug(`${message}`, args.length > 0 ? args[0] : null);
  },
  info: (message, ...args) => {
    console.log(`[ClaudeRobot][INFO] ${message}`, ...args);
    if (electronLogger) electronLogger.info(`${message}`, args.length > 0 ? args[0] : null);
  },
  warn: (message, ...args) => {
    console.warn(`[ClaudeRobot][WARNING] ${message}`, ...args);
    if (electronLogger) electronLogger.warn(`${message}`, args.length > 0 ? args[0] : null);
  },
  error: (message, ...args) => {
    console.error(`[ClaudeRobot][ERROR] ${message}`, ...args);
    const errorObj = args.find(arg => arg instanceof Error);
    if (electronLogger) electronLogger.error(`${message}`, errorObj || (args.length > 0 ? args[0] : null));
  }
};

class ClaudeRobot {
  constructor(container, options = {}) {
    try {
      // Record initialization time for diagnostics
      this._initTimestamp = new Date().toISOString();
      
      // Set debug level based on URL parameters if in browser environment
      let debugFromUrl = false;
      try {
        if (typeof window !== 'undefined' && window.location && window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          debugFromUrl = urlParams.has('debug') || urlParams.has('robot_debug');
        }
      } catch (urlError) {
        console.error('Error parsing URL parameters:', urlError);
      }
      
      robotLogger.info('Initializing Claude Robot interface');
      robotLogger.debug(`Initialization timestamp: ${this._initTimestamp}`);
      
      // Validate container
      if (!container) {
        throw new Error('Container element is required');
      }
      
      if (!(container instanceof HTMLElement)) {
        throw new Error('Container must be a valid HTML element');
      }
      
      robotLogger.debug(`Container validated: ${container.tagName}#${container.id || 'no-id'}`);
      
      this.container = container;
      this.options = Object.assign({
        apiKey: null,
        defaultSystemPrompt: 'You are Claude, an AI assistant by Anthropic.',
        enableSpeech: true,
        enableTranscript: true,
        enableSentimentAnalysis: true,
        faceOptions: {},
        speechOptions: {},
        debug: debugFromUrl || false, // Set to true for additional debug logging
        logAssetLoading: true, // Log details about asset loading
        logApiStatus: true, // Log API availability
      }, options);
      
      robotLogger.debug('Options processed', this.options);
      
      // Enable debug logging if requested
      if (this.options.debug) {
        this._enableDebugLogging();
      }
      
      // Detect Electron environment with multiple methods for better accuracy
      this.isElectron = false;
      try {
        // Method 1: Check for window.process
        if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
          this.isElectron = true;
          robotLogger.debug('Electron detected via window.process.type');
        }
        // Method 2: Check for Electron in user agent
        else if (typeof window !== 'undefined' && window.navigator && 
          window.navigator.userAgent && window.navigator.userAgent.indexOf('Electron') !== -1) {
          this.isElectron = true;
          robotLogger.debug('Electron detected via userAgent');
        }
        // Method 3: Check for window.api (our Electron preload bridge)
        else if (typeof window !== 'undefined' && window.api) {
          this.isElectron = true;
          robotLogger.debug('Electron detected via window.api bridge');
        }
        
        // Log environment info
        robotLogger.info(`Environment detected: ${this.isElectron ? 'Electron' : 'Browser'}`);
        
        // Log user agent for debugging
        if (typeof window !== 'undefined' && window.navigator) {
          robotLogger.debug(`User Agent: ${window.navigator.userAgent}`);
        }
      } catch (envError) {
        robotLogger.error('Error detecting environment:', envError);
        // Default to false if detection fails
        this.isElectron = false;
      }
      
      // Component state
      this.state = {
        initialized: false,
        listening: false,
        thinking: false,
        speaking: false,
        error: null,
        lastResponse: null,
        transcript: [],
        componentStatus: {
          face: false,
          speech: false,
          sentiment: false
        }
      };
      
      // Feature detection results
      this.features = {
        svgSupport: false,
        webSpeechSupport: false,
        animationSupport: false
      };
      
      // Check for feature support
      this._detectFeatures();
      
      // Initialize components (with error handling)
      this.initComponents();
    } catch (error) {
      robotLogger.error('Failed to initialize Claude Robot:', error);
      this.state.error = error.message;
      
      // Try to create a basic error message in the container
      try {
        this._showInitializationError(error);
      } catch (displayError) {
        robotLogger.error('Failed to display error message:', displayError);
      }
    }
  }
  
  _enableDebugLogging() {
    // Replace standard console logging with more verbose logging when debug is enabled
    robotLogger.debug = (message, ...args) => {
      console.debug(`[ClaudeRobot][DEBUG] ${message}`, ...args);
    };
  }
  
  _detectFeatures() {
    robotLogger.info('Detecting browser feature support...');
    
    try {
      // Check SVG support - multiple checks for better detection
      let svgSupport = false;
      try {
        svgSupport = (
          typeof SVGElement !== 'undefined' && 
          document.implementation && 
          document.implementation.hasFeature && 
          document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") && 
          typeof document.createElementNS === 'function'
        );
        
        // Additional runtime test - try to create an SVG element
        if (svgSupport) {
          const testSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svgSupport = testSvg instanceof SVGElement;
        }
      } catch (svgError) {
        robotLogger.error('SVG feature detection error:', svgError);
        svgSupport = false;
      }
      this.features.svgSupport = svgSupport;

      // Check Web Speech API support - enhanced detection
      let speechSupport = false;
      try {
        speechSupport = (
          typeof window !== 'undefined' && 
          'speechSynthesis' in window && 
          typeof window.speechSynthesis === 'object' && 
          'SpeechSynthesisUtterance' in window
        );
        
        // Additional runtime test - try to create an utterance
        if (speechSupport) {
          const testUtterance = new SpeechSynthesisUtterance("Test");
          speechSupport = testUtterance instanceof SpeechSynthesisUtterance;
          
          // Check if getVoices is available
          speechSupport = speechSupport && typeof window.speechSynthesis.getVoices === 'function';
        }
      } catch (speechError) {
        robotLogger.error('Speech API feature detection error:', speechError);
        speechSupport = false;
      }
      this.features.webSpeechSupport = speechSupport;
      
      // Check animation support with fallbacks
      let animationSupport = false;
      try {
        animationSupport = (
          typeof window !== 'undefined' && 
          ('requestAnimationFrame' in window || 
           'webkitRequestAnimationFrame' in window || 
           'mozRequestAnimationFrame' in window)
        );
      } catch (animError) {
        robotLogger.error('Animation feature detection error:', animError);
        animationSupport = false;
      }
      this.features.animationSupport = animationSupport;
      
      // Check audio support
      let audioSupport = false;
      try {
        audioSupport = (
          typeof window !== 'undefined' && 
          typeof Audio === 'function' && 
          typeof new Audio().canPlayType === 'function'
        );
      } catch (audioError) {
        robotLogger.error('Audio feature detection error:', audioError);
        audioSupport = false;
      }
      this.features.audioSupport = audioSupport;
      
      robotLogger.info(`Feature detection results: SVG: ${this.features.svgSupport}, ` +
                       `Web Speech: ${this.features.webSpeechSupport}, ` +
                       `Animation: ${this.features.animationSupport}, ` +
                       `Audio: ${this.features.audioSupport}`);
    } catch (error) {
      robotLogger.error('Error during feature detection:', error);
      // Default everything to false if detection fails
      this.features = {
        svgSupport: false,
        webSpeechSupport: false,
        animationSupport: false,
        audioSupport: false
      };
    }
  }
  
  _showInitializationError(error) {
    // Create a basic error display to show in the container
    if (!this.container) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'claude-robot-error';
    errorDiv.style.padding = '20px';
    errorDiv.style.backgroundColor = '#ffcccc';
    errorDiv.style.border = '1px solid #ff0000';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.color = '#990000';
    errorDiv.style.margin = '10px';
    
    const errorTitle = document.createElement('h3');
    errorTitle.textContent = 'Robot Interface Error';
    errorDiv.appendChild(errorTitle);
    
    const errorMessage = document.createElement('p');
    errorMessage.textContent = error.message || 'Failed to initialize the robot interface';
    errorDiv.appendChild(errorMessage);
    
    const detailsMessage = document.createElement('p');
    detailsMessage.textContent = 'Check the browser console for more details (F12)';
    errorDiv.appendChild(detailsMessage);
    
    // Clear container and add error message
    this.container.innerHTML = '';
    this.container.appendChild(errorDiv);
  }
  
  initComponents() {
    robotLogger.info('Initializing robot components...');
    
    try {
      // Create container elements
      this.createContainers();
      
      // Verify required features before initializing components
      if (!this.features.svgSupport) {
        robotLogger.error('SVG support is required but not available in this environment.');
        throw new Error('SVG support is required but not available in this environment. Please use a modern browser with SVG support.');
      }
      
      // Initialize robot face with enhanced error detection
      robotLogger.info('Initializing robot face...');
      try {
        // Verify container exists and is valid
        if (!this.faceContainer || !(this.faceContainer instanceof HTMLElement)) {
          throw new Error('Invalid face container element');
        }
        
        // Initialize with enhanced error handling
        this.robotFace = new RobotFace(this.faceContainer, {
          ...this.options.faceOptions,
          isElectron: this.isElectron, // Pass electron context for better path resolution
          debug: this.options.debug
        });
        
        robotLogger.info('Robot face initialized successfully');
        this.state.componentStatus.face = true;
      } catch (faceError) {
        const errorMsg = `Failed to initialize robot face: ${faceError.message}`;
        robotLogger.error(errorMsg, faceError);
        // Add stack trace for debugging
        if (faceError.stack) {
          robotLogger.debug('Face initialization error stack:', faceError.stack);
        }
        this.state.componentStatus.face = false;
        throw new Error(errorMsg);
      }
      
      // Initialize speech synthesis (if enabled)
      if (this.options.enableSpeech) {
        robotLogger.info('Initializing speech manager...');
        
        // Check Web Speech API availability first
        if (!this.features.webSpeechSupport) {
          robotLogger.error('Web Speech API is required but not available in this environment.');
          throw new Error('Speech synthesis is not supported in this browser.');
        }
        
        try {
          // Create enhanced speech manager with environment awareness
          this.speechManager = new SpeechManager({
            ...this.options.speechOptions,
            isElectron: this.isElectron,
            debug: this.options.debug
          });
          
          // Verify speech manager initialization
          if (!this.speechManager.isInitialized()) {
            throw new Error('Speech manager initialized but in failed state');
          }
          
          robotLogger.info('Speech manager initialized successfully');
          this.state.componentStatus.speech = true;
          
          // Connect speech events to robot face
          try {
            this._connectSpeechEvents();
            robotLogger.debug('Speech events connected successfully');
          } catch (eventError) {
            robotLogger.error('Failed to connect speech events:', eventError);
            // Do not fail completely on event connection failure
          }
        } catch (speechError) {
          const errorMsg = `Failed to initialize speech manager: ${speechError.message}`;
          robotLogger.error(errorMsg, speechError);
          
          // Add stack trace for debugging
          if (speechError.stack) {
            robotLogger.debug('Speech initialization error stack:', speechError.stack);
          }
          
          // We'll continue without speech rather than failing completely
          this.options.enableSpeech = false;
          this.state.componentStatus.speech = false;
          this.state.error = errorMsg;
          
          // Don't throw here - continue without speech
          robotLogger.warn('Continuing without speech capabilities');
        }
      } else {
        robotLogger.info('Speech synthesis disabled by configuration');
      }
      
      // Initialize sentiment analyzer
      if (this.options.enableSentimentAnalysis) {
        robotLogger.info('Initializing sentiment analyzer');
        try {
          this.sentimentAnalyzer = new SentimentAnalyzer();
          
          // Verify analyzer initialization
          if (this.sentimentAnalyzer.isReady && !this.sentimentAnalyzer.isReady()) {
            throw new Error('Sentiment analyzer initialized but not ready');
          }
          
          robotLogger.info('Sentiment analyzer initialized successfully');
          this.state.componentStatus.sentiment = true;
        } catch (sentimentError) {
          const errorMsg = `Failed to initialize sentiment analyzer: ${sentimentError.message}`;
          robotLogger.error(errorMsg, sentimentError);
          
          // Add stack trace for debugging
          if (sentimentError.stack) {
            robotLogger.debug('Sentiment initialization error stack:', sentimentError.stack);
          }
          
          // Continue without sentiment analysis
          this.options.enableSentimentAnalysis = false;
          this.state.componentStatus.sentiment = false;
          // Don't throw here - continue without sentiment analysis
        }
      } else {
        robotLogger.info('Sentiment analysis disabled by configuration');
      }
      
      // Set up control elements
      try {
        this.setupControls();
        robotLogger.debug('Controls setup complete');
      } catch (controlsError) {
        robotLogger.error('Failed to set up controls:', controlsError);
        // Don't fail if controls can't be set up
      }
      
      // Check if any required components failed
      if (!this.state.componentStatus.face) {
        robotLogger.error('Required component "face" failed to initialize');
        throw new Error('Required component "face" failed to initialize');
      }
      
      // Mark initialized if we get here
      this.state.initialized = true;
      robotLogger.info('Robot interface initialized successfully');
      robotLogger.info(`Component status: Face: ${this.state.componentStatus.face}, Speech: ${this.state.componentStatus.speech}, Sentiment: ${this.state.componentStatus.sentiment}`);
      
      // Set up diagnostic mode listeners if in Electron
      if (this.isElectron && typeof window !== 'undefined' && window.api) {
        this._setupDiagnosticModeListeners();
      }
      
      // Generate an immediate diagnostics report
      setTimeout(() => {
        robotLogger.debug('Generating initial diagnostics report');
        const diagnostics = this.getDiagnostics();
        
        // When in Electron, attempt to log diagnostics to the main process
        if (this.isElectron && window.api && window.api.logger) {
          try {
            window.api.logger.info('Initial robot diagnostics after initialization', diagnostics);
          } catch (logError) {
            robotLogger.error('Failed to log initial diagnostics:', logError);
          }
        }
      }, 1000);
      
    } catch (error) {
      robotLogger.error('Component initialization failed:', error);
      this.state.error = error.message;
      this.state.initialized = false;
      
      // Try to show initialization error
      this._showInitializationError(error);
      
      // Try to log detailed error information for diagnostics
      if (this.isElectron && window.api && window.api.logger) {
        try {
          window.api.logger.error('Robot interface initialization failed', {
            error: error.message,
            stack: error.stack,
            type: error.constructor.name,
            features: this.features,
            componentStatus: this.state.componentStatus
          });
        } catch (logError) {
          console.error('Failed to log error details:', logError);
        }
      }
      
      throw error; // Re-throw to the constructor
    }
  }
  
  /**
   * Set up listeners for diagnostic mode requests from the main process
   * These enable deeper debugging capabilities when troubleshooting
   */
  _setupDiagnosticModeListeners() {
    try {
      robotLogger.debug('Setting up diagnostic mode listeners');
      
      // Listen for diagnostic mode toggle
      if (window.api.onToggleRobotDiagnostics) {
        window.api.onToggleRobotDiagnostics((event, enabled) => {
          try {
            robotLogger.info(`Diagnostic mode ${enabled ? 'enabled' : 'disabled'}`);
            
            // Enable debug logging when in diagnostic mode
            this.options.debug = enabled;
            
            if (enabled) {
              this._enableDebugLogging();
              
              // Show debug container if available
              if (this.debugContainer) {
                this.debugContainer.style.display = 'block';
              }
              
              // Generate immediate diagnostic report
              const diagnostics = this.getDiagnostics();
              
              if (window.api.logger) {
                window.api.logger.info('Diagnostic mode enabled, collecting diagnostics', diagnostics);
              }
            } else {
              // Hide debug container if available
              if (this.debugContainer) {
                this.debugContainer.style.display = 'none';
              }
            }
          } catch (error) {
            robotLogger.error('Error handling diagnostic mode toggle:', error);
          }
        });
      }
      
      // Listen for diagnostic logging requests
      if (window.api.onLogRobotDiagnostics) {
        window.api.onLogRobotDiagnostics(() => {
          try {
            robotLogger.info('Diagnostic logging requested');
            const diagnostics = this.getDiagnostics();
            
            if (window.api.logger) {
              window.api.logger.info('Robot diagnostics requested via menu', diagnostics);
            }
          } catch (error) {
            robotLogger.error('Error generating diagnostics:', error);
          }
        });
      }
      
    } catch (error) {
      robotLogger.error('Failed to set up diagnostic listeners:', error);
    }
  }
  
  _connectSpeechEvents() {
    robotLogger.debug('Connecting speech events to robot face');
    
    // Start speaking event
    this.speechManager.on('start', () => {
      try {
        robotLogger.debug('Speech started, triggering robot face animation');
        this.robotFace.startSpeaking();
        this.state.speaking = true;
      } catch (error) {
        robotLogger.error('Error in speech start handler:', error);
      }
    });
    
    // End speaking event
    this.speechManager.on('end', () => {
      try {
        robotLogger.debug('Speech ended, stopping robot face animation');
        this.robotFace.stopSpeaking();
        this.state.speaking = false;
      } catch (error) {
        robotLogger.error('Error in speech end handler:', error);
        // Force reset speaking state
        this.state.speaking = false;
      }
    });
    
    // Speech error event
    this.speechManager.on('error', (event) => {
      robotLogger.error('Speech error event received:', event);
      try {
        this.robotFace.stopSpeaking();
        this.state.speaking = false;
      } catch (error) {
        robotLogger.error('Error in speech error handler:', error);
        // Force reset speaking state
        this.state.speaking = false;
      }
    });
  }
  
  createContainers() {
    robotLogger.debug('Creating UI containers');
    
    try {
      // Main container to hold everything
      this.mainContainer = document.createElement('div');
      this.mainContainer.className = 'claude-robot-container';
      
      // Add in a try/catch to handle potential DOM errors
      try {
        this.container.appendChild(this.mainContainer);
      } catch (domError) {
        robotLogger.error('Failed to append main container to parent:', domError);
        throw new Error(`DOM operation failed: ${domError.message}`);
      }
      
      // Status display for showing initialization progress and errors
      this.statusContainer = document.createElement('div');
      this.statusContainer.className = 'robot-status-container';
      this.statusContainer.style.display = 'none'; // Hidden by default
      this.mainContainer.appendChild(this.statusContainer);
      
      // Debug information display (visible when debug is enabled)
      if (this.options.debug) {
        this.debugContainer = document.createElement('div');
        this.debugContainer.className = 'robot-debug-container';
        this.debugContainer.style.fontSize = '11px';
        this.debugContainer.style.fontFamily = 'monospace';
        this.debugContainer.style.border = '1px solid #ddd';
        this.debugContainer.style.padding = '5px';
        this.debugContainer.style.margin = '5px 0';
        this.debugContainer.style.backgroundColor = '#f9f9f9';
        this.debugContainer.style.maxHeight = '100px';
        this.debugContainer.style.overflow = 'auto';
        this.debugContainer.style.display = 'none'; // Hidden by default
        this.debugContainer.innerHTML = '<div>Debug information will appear here</div>';
        this.mainContainer.appendChild(this.debugContainer);
      }
      
      // Face container
      this.faceContainer = document.createElement('div');
      this.faceContainer.className = 'robot-face-container';
      this.mainContainer.appendChild(this.faceContainer);
      
      // Controls container
      this.controlsContainer = document.createElement('div');
      this.controlsContainer.className = 'robot-controls-container';
      this.mainContainer.appendChild(this.controlsContainer);
      
      // Transcript container (optional)
      if (this.options.enableTranscript) {
        this.transcriptContainer = document.createElement('div');
        this.transcriptContainer.className = 'robot-transcript-container';
        this.transcriptContainer.style.maxHeight = '200px';
        this.transcriptContainer.style.overflow = 'auto';
        this.transcriptContainer.style.marginTop = '10px';
        this.transcriptContainer.style.border = '1px solid #ddd';
        this.transcriptContainer.style.padding = '10px';
        this.mainContainer.appendChild(this.transcriptContainer);
      }
      
      // Version and status info
      const infoContainer = document.createElement('div');
      infoContainer.className = 'robot-info-container';
      infoContainer.style.fontSize = '11px';
      infoContainer.style.textAlign = 'right';
      infoContainer.style.color = '#666';
      infoContainer.style.padding = '2px 5px';
      infoContainer.textContent = `Claude Robot Interface | Environment: ${this.isElectron ? 'Electron' : 'Browser'}`;
      this.mainContainer.appendChild(infoContainer);
      
      // Toggle debug view button (when debug is enabled)
      if (this.options.debug) {
        const debugToggle = document.createElement('a');
        debugToggle.href = '#';
        debugToggle.textContent = 'Show debug';
        debugToggle.style.marginLeft = '10px';
        debugToggle.style.textDecoration = 'none';
        debugToggle.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.debugContainer.style.display === 'none') {
            this.debugContainer.style.display = 'block';
            debugToggle.textContent = 'Hide debug';
            
            // Update debug info
            this.updateDebugInfo();
          } else {
            this.debugContainer.style.display = 'none';
            debugToggle.textContent = 'Show debug';
          }
        });
        infoContainer.appendChild(debugToggle);
      }
      
      robotLogger.debug('UI containers created successfully');
    } catch (error) {
      robotLogger.error('Failed to create UI containers:', error);
      throw new Error(`Failed to create UI containers: ${error.message}`);
    }
  }
  
  // Helper method to update debug information display
  updateDebugInfo() {
    if (!this.options.debug || !this.debugContainer) return;
    
    try {
      const featureInfo = Object.entries(this.features)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
      
      const componentInfo = Object.entries(this.state.componentStatus)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
      
      this.debugContainer.innerHTML = `
        <div><strong>Features:</strong> ${featureInfo}</div>
        <div><strong>Components:</strong> ${componentInfo}</div>
        <div><strong>Error:</strong> ${this.state.error || 'None'}</div>
        <div><strong>Environment:</strong> ${this.isElectron ? 'Electron' : 'Browser'}</div>
      `;
    } catch (error) {
      robotLogger.error('Failed to update debug info:', error);
    }
  }
  
  setupControls() {
    robotLogger.debug('Setting up control elements');
    
    try {
      // Add control title
      const controlsTitle = document.createElement('div');
      controlsTitle.className = 'robot-controls-title';
      controlsTitle.textContent = 'Speech Controls';
      controlsTitle.style.fontWeight = 'bold';
      controlsTitle.style.marginBottom = '10px';
      controlsTitle.style.textAlign = 'center';
      this.controlsContainer.appendChild(controlsTitle);
      
      // Volume control (if speech is enabled)
      if (!this.options.enableSpeech || !this.speechManager) {
        robotLogger.debug('Speech not enabled, skipping speech controls');
        
        // Add a message indicating speech is not available
        const speechDisabledMsg = document.createElement('div');
        speechDisabledMsg.className = 'robot-speech-disabled';
        speechDisabledMsg.textContent = 'Speech synthesis not available in this browser';
        speechDisabledMsg.style.textAlign = 'center';
        speechDisabledMsg.style.padding = '10px';
        speechDisabledMsg.style.color = '#666';
        this.controlsContainer.appendChild(speechDisabledMsg);
        
        return;
      }
      
      // Create a controls grid container for better layout
      const controlsGrid = document.createElement('div');
      controlsGrid.className = 'robot-controls-grid';
      controlsGrid.style.display = 'grid';
      controlsGrid.style.gridTemplateColumns = 'auto 1fr auto';
      controlsGrid.style.gap = '10px';
      controlsGrid.style.alignItems = 'center';
      controlsGrid.style.marginBottom = '15px';
      this.controlsContainer.appendChild(controlsGrid);
      
      // Volume slider
      try {
        robotLogger.debug('Creating volume controls');
        
        const volumeLabel = document.createElement('label');
        volumeLabel.textContent = 'Volume:';
        volumeLabel.style.gridColumn = '1';
        controlsGrid.appendChild(volumeLabel);
        
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = '0';
        volumeSlider.max = '1';
        volumeSlider.step = '0.1';
        volumeSlider.value = this.speechManager.getConfig().volume;
        volumeSlider.style.gridColumn = '2';
        volumeSlider.style.width = '100%';
        controlsGrid.appendChild(volumeSlider);
        
        // Add error handling with try/catch
        volumeSlider.addEventListener('input', () => {
          try {
            const volume = parseFloat(volumeSlider.value);
            this.speechManager.setVolume(volume);
            robotLogger.debug(`Volume set to: ${volume}`);
          } catch (error) {
            robotLogger.error('Error setting volume:', error);
            this.showError(`Failed to set volume: ${error.message}`);
          }
        });
        
        // Mute button
        const muteButton = document.createElement('button');
        muteButton.className = 'robot-mute-button';
        muteButton.innerHTML = this.speechManager.isMuted() ? '🔇' : '🔊';
        muteButton.style.gridColumn = '3';
        muteButton.style.padding = '5px 10px';
        muteButton.title = this.speechManager.isMuted() ? 'Unmute' : 'Mute';
        
        // Add error handling
        muteButton.addEventListener('click', () => {
          try {
            const muted = this.speechManager.toggleMute();
            muteButton.innerHTML = muted ? '🔇' : '🔊';
            muteButton.title = muted ? 'Unmute' : 'Mute';
            robotLogger.debug(`Mute toggled: ${muted}`);
          } catch (error) {
            robotLogger.error('Error toggling mute:', error);
            this.showError(`Failed to toggle mute: ${error.message}`);
          }
        });
        controlsGrid.appendChild(muteButton);
        
      } catch (volumeError) {
        robotLogger.error('Failed to create volume controls:', volumeError);
      }
      
      // Voice selector
      try {
        robotLogger.debug('Creating voice selector');
        
        const voiceLabel = document.createElement('label');
        voiceLabel.textContent = 'Voice:';
        voiceLabel.style.gridColumn = '1';
        controlsGrid.appendChild(voiceLabel);
        
        const voiceSelector = document.createElement('select');
        voiceSelector.className = 'robot-voice-selector';
        voiceSelector.style.gridColumn = '2 / span 2';
        voiceSelector.style.width = '100%';
        voiceSelector.style.padding = '5px';
        
        // Add a loading option
        const loadingOption = document.createElement('option');
        loadingOption.textContent = 'Loading voices...';
        loadingOption.disabled = true;
        loadingOption.selected = true;
        voiceSelector.appendChild(loadingOption);
        
        // Add a placeholder for voice loading status
        const voiceStatus = document.createElement('div');
        voiceStatus.className = 'robot-voice-status';
        voiceStatus.style.gridColumn = '1 / span 3';
        voiceStatus.style.fontSize = '11px';
        voiceStatus.style.color = '#666';
        voiceStatus.textContent = 'Waiting for voices to load...';
        controlsGrid.appendChild(voiceStatus);
        
        controlsGrid.appendChild(voiceSelector);
        
        // Function to populate voices with retry
        const populateVoices = (retryCount = 0, maxRetries = 5) => {
          try {
            const voices = this.speechManager.getAvailableVoices();
            
            if (voices && voices.length > 0) {
              // Clear loading option
              voiceSelector.innerHTML = '';
              
              robotLogger.debug(`Loaded ${voices.length} voices`);
              voiceStatus.textContent = `Loaded ${voices.length} voices`;
              
              // Group voices by language
              const voicesByLang = {};
              voices.forEach(voice => {
                const lang = voice.lang.split('-')[0]; // Get base language
                if (!voicesByLang[lang]) {
                  voicesByLang[lang] = [];
                }
                voicesByLang[lang].push(voice);
              });
              
              // Preferred language first (English)
              const preferred = 'en';
              
              // Add English voices first, then others in alphabetical order
              const orderedLangs = Object.keys(voicesByLang).sort((a, b) => {
                if (a === preferred) return -1;
                if (b === preferred) return 1;
                return a.localeCompare(b);
              });
              
              // Add voice options by language groups
              orderedLangs.forEach(lang => {
                const langGroup = document.createElement('optgroup');
                langGroup.label = new Intl.DisplayNames([navigator.language], { type: 'language' }).of(lang);
                
                voicesByLang[lang].forEach(voice => {
                  const option = document.createElement('option');
                  option.value = voice.name;
                  option.textContent = voice.name;
                  
                  // Select current voice
                  if (this.speechManager.getConfig().voice && 
                      this.speechManager.getConfig().voice.name === voice.name) {
                    option.selected = true;
                  }
                  
                  langGroup.appendChild(option);
                });
                
                voiceSelector.appendChild(langGroup);
              });
              
              // Handle voice change
              voiceSelector.addEventListener('change', () => {
                try {
                  robotLogger.debug(`Setting voice to: ${voiceSelector.value}`);
                  this.speechManager.setVoice(voiceSelector.value);
                } catch (error) {
                  robotLogger.error('Error setting voice:', error);
                  this.showError(`Failed to set voice: ${error.message}`);
                }
              });
            } else {
              // No voices available yet, retry with exponential backoff
              if (retryCount < maxRetries) {
                const delay = Math.min(100 * Math.pow(2, retryCount), 3000);
                voiceStatus.textContent = `Waiting for voices (attempt ${retryCount + 1}/${maxRetries})...`;
                
                robotLogger.debug(`No voices loaded yet, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                setTimeout(() => populateVoices(retryCount + 1, maxRetries), delay);
              } else {
                // Max retries reached
                voiceStatus.textContent = 'No voices available. Try refreshing the page.';
                robotLogger.warn(`No voices available after ${maxRetries} attempts`);
                voiceSelector.innerHTML = '';
                
                const noVoicesOption = document.createElement('option');
                noVoicesOption.textContent = 'No voices available';
                noVoicesOption.disabled = true;
                voiceSelector.appendChild(noVoicesOption);
                voiceSelector.disabled = true;
              }
            }
          } catch (voicesError) {
            robotLogger.error('Error populating voice selector:', voicesError);
            voiceStatus.textContent = `Error loading voices: ${voicesError.message}`;
            voiceSelector.disabled = true;
          }
        };
        
        // Start voice loading process
        setTimeout(() => populateVoices(), 100);
        
      } catch (selectorError) {
        robotLogger.error('Failed to create voice selector:', selectorError);
      }
      
      // Speech rate control
      try {
        robotLogger.debug('Creating speech rate control');
        
        const rateLabel = document.createElement('label');
        rateLabel.textContent = 'Speed:';
        rateLabel.style.gridColumn = '1';
        controlsGrid.appendChild(rateLabel);
        
        const rateSlider = document.createElement('input');
        rateSlider.type = 'range';
        rateSlider.min = '0.5';
        rateSlider.max = '2';
        rateSlider.step = '0.1';
        rateSlider.value = this.speechManager.getConfig().rate;
        rateSlider.style.gridColumn = '2';
        rateSlider.style.width = '100%';
        controlsGrid.appendChild(rateSlider);
        
        // Show current speech rate value
        const rateValue = document.createElement('span');
        rateValue.className = 'robot-rate-value';
        rateValue.textContent = `${parseFloat(rateSlider.value).toFixed(1)}x`;
        rateValue.style.gridColumn = '3';
        rateValue.style.textAlign = 'center';
        rateValue.style.minWidth = '30px';
        controlsGrid.appendChild(rateValue);
        
        rateSlider.addEventListener('input', () => {
          try {
            const rate = parseFloat(rateSlider.value);
            this.speechManager.setRate(rate);
            rateValue.textContent = `${rate.toFixed(1)}x`;
            robotLogger.debug(`Speech rate set to: ${rate}`);
          } catch (error) {
            robotLogger.error('Error setting speech rate:', error);
            this.showError(`Failed to set speech rate: ${error.message}`);
          }
        });
      } catch (rateError) {
        robotLogger.error('Failed to create speech rate control:', rateError);
      }
      
      // Pitch control
      try {
        robotLogger.debug('Creating speech pitch control');
        
        const pitchLabel = document.createElement('label');
        pitchLabel.textContent = 'Pitch:';
        pitchLabel.style.gridColumn = '1';
        controlsGrid.appendChild(pitchLabel);
        
        const pitchSlider = document.createElement('input');
        pitchSlider.type = 'range';
        pitchSlider.min = '0.5';
        pitchSlider.max = '2';
        pitchSlider.step = '0.1';
        pitchSlider.value = this.speechManager.getConfig().pitch || 1;
        pitchSlider.style.gridColumn = '2';
        pitchSlider.style.width = '100%';
        controlsGrid.appendChild(pitchSlider);
        
        // Show current pitch value
        const pitchValue = document.createElement('span');
        pitchValue.className = 'robot-pitch-value';
        pitchValue.textContent = `${parseFloat(pitchSlider.value).toFixed(1)}`;
        pitchValue.style.gridColumn = '3';
        pitchValue.style.textAlign = 'center';
        pitchValue.style.minWidth = '30px';
        controlsGrid.appendChild(pitchValue);
        
        pitchSlider.addEventListener('input', () => {
          try {
            const pitch = parseFloat(pitchSlider.value);
            this.speechManager.setPitch(pitch);
            pitchValue.textContent = `${pitch.toFixed(1)}`;
            robotLogger.debug(`Speech pitch set to: ${pitch}`);
          } catch (error) {
            robotLogger.error('Error setting speech pitch:', error);
            this.showError(`Failed to set speech pitch: ${error.message}`);
          }
        });
      } catch (pitchError) {
        robotLogger.error('Failed to create speech pitch control:', pitchError);
      }
      
      // Test speech button
      try {
        robotLogger.debug('Creating test speech button');
        
        const testContainer = document.createElement('div');
        testContainer.style.gridColumn = '1 / span 3';
        testContainer.style.textAlign = 'center';
        testContainer.style.marginTop = '10px';
        controlsGrid.appendChild(testContainer);
        
        const testButton = document.createElement('button');
        testButton.className = 'robot-test-speech';
        testButton.textContent = 'Test Speech';
        testButton.style.padding = '5px 15px';
        testButton.style.marginTop = '5px';
        
        testButton.addEventListener('click', () => {
          try {
            robotLogger.debug('Testing speech...');
            this.robotFace.setEmotion('happy');
            this.speechManager.speak('Hello, I am Claude. Your AI assistant.');
          } catch (error) {
            robotLogger.error('Error testing speech:', error);
            this.showError(`Failed to test speech: ${error.message}`);
          }
        });
        
        testContainer.appendChild(testButton);
      } catch (testError) {
        robotLogger.error('Failed to create test speech button:', testError);
      }
      
      // Interface mode toggle (between robot face and chat)
      try {
        robotLogger.debug('Creating interface toggle');
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'robot-toggle-container';
        toggleContainer.style.textAlign = 'center';
        toggleContainer.style.margin = '15px 0 5px';
        
        const toggleButton = document.createElement('button');
        toggleButton.className = 'robot-toggle-button';
        toggleButton.textContent = 'Switch to Chat View';
        toggleButton.style.padding = '8px 20px';
        
        toggleButton.addEventListener('click', () => {
          // This would be implemented by the parent application
          if (typeof this.options.onToggleView === 'function') {
            this.options.onToggleView();
          }
        });
        
        toggleContainer.appendChild(toggleButton);
        this.controlsContainer.appendChild(toggleContainer);
      } catch (toggleError) {
        robotLogger.error('Failed to create interface toggle:', toggleError);
      }
      
      robotLogger.debug('Control setup complete');
    } catch (error) {
      robotLogger.error('Failed to set up controls:', error);
      // Try to create minimal controls
      try {
        this.controlsContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#f00;">Failed to initialize controls</div>';
      } catch (fallbackError) {
        // Last resort - nothing else we can do
      }
    }
  }
  
  // Process a message from Claude API and animate/speak response
  processClaudeResponse(response) {
    robotLogger.debug('Processing Claude response');
    
    try {
      if (!response) {
        robotLogger.error('Empty response received from Claude');
        this.showError('Empty response from Claude');
        return;
      }
      
      // Check if components are initialized
      if (!this.state.initialized) {
        robotLogger.error('Cannot process response - components not initialized');
        this.showError('Robot interface not fully initialized');
        return;
      }
      
      // Save response
      this.state.lastResponse = response;
      
      // Add to transcript if enabled
      if (this.options.enableTranscript) {
        try {
          this.addToTranscript('claude', response);
          this.scrollTranscriptToBottom();
        } catch (transcriptError) {
          robotLogger.error('Error adding message to transcript:', transcriptError);
        }
      }
      
      // Analyze sentiment if enabled
      if (this.options.enableSentimentAnalysis && this.sentimentAnalyzer) {
        try {
          robotLogger.debug('Analyzing sentiment of response');
          const sentiment = this.sentimentAnalyzer.analyze(response);
          
          // Set robot face emotion based on sentiment
          if (sentiment.confidence > 0.3) { // Only change if confidence is reasonable
            robotLogger.debug(`Setting emotion: ${sentiment.emotion} (confidence: ${sentiment.confidence.toFixed(2)})`);
            this.robotFace.setEmotion(sentiment.emotion);
          } else {
            robotLogger.debug(`Sentiment confidence too low (${sentiment.confidence.toFixed(2)}), using neutral expression`);
          }
        } catch (sentimentError) {
          robotLogger.error('Error during sentiment analysis:', sentimentError);
        }
      }
      
      // Speak response if speech is enabled
      if (this.options.enableSpeech && this.speechManager) {
        try {
          robotLogger.debug('Speaking response');
          this.speechManager.speak(response);
        } catch (speechError) {
          robotLogger.error('Error during speech synthesis:', speechError);
          // Try to recover the face if speech fails
          try {
            this.robotFace.stopSpeaking();
          } catch (faceRecoveryError) {
            robotLogger.error('Error recovering face after speech failure:', faceRecoveryError);
          }
        }
      }
      
      robotLogger.debug('Response processing complete');
    } catch (error) {
      robotLogger.error('Error processing Claude response:', error);
      this.showError(`Failed to process response: ${error.message}`);
    }
  }
  
  // Add user or Claude message to transcript
  addToTranscript(sender, message) {
    try {
      if (!this.options.enableTranscript || !this.transcriptContainer) {
        return;
      }
      
      robotLogger.debug(`Adding ${sender} message to transcript`);
      
      // Create message element
      const messageElement = document.createElement('div');
      messageElement.className = `transcript-message ${sender}-message`;
      
      // Create sender label
      const senderLabel = document.createElement('div');
      senderLabel.className = 'message-sender';
      senderLabel.textContent = sender === 'claude' ? 'Claude' : 'You';
      messageElement.appendChild(senderLabel);
      
      // Create message content
      const contentElement = document.createElement('div');
      contentElement.className = 'message-content';
      
      // Safely set text content (truncate if extremely long)
      try {
        if (message.length > 10000) {
          contentElement.textContent = message.substring(0, 10000) + '... (message truncated)';
        } else {
          contentElement.textContent = message;
        }
      } catch (textError) {
        robotLogger.error('Error setting message content:', textError);
        contentElement.textContent = '[Error displaying message content]';
      }
      
      messageElement.appendChild(contentElement);
      
      // Add timestamp
      const timestamp = document.createElement('div');
      timestamp.className = 'message-timestamp';
      timestamp.textContent = new Date().toLocaleTimeString();
      messageElement.appendChild(timestamp);
      
      // Add to transcript container
      this.transcriptContainer.appendChild(messageElement);
      
      // Add to transcript array
      this.state.transcript.push({
        sender,
        message: message.length > 1000 ? message.substring(0, 1000) + '... (truncated in memory)' : message,
        timestamp: new Date()
      });
      
      // Scroll to bottom
      this.scrollTranscriptToBottom();
    } catch (error) {
      robotLogger.error('Error adding message to transcript:', error);
    }
  }
  
  scrollTranscriptToBottom() {
    try {
      if (this.transcriptContainer) {
        this.transcriptContainer.scrollTop = this.transcriptContainer.scrollHeight;
      }
    } catch (error) {
      robotLogger.error('Error scrolling transcript:', error);
    }
  }
  
  // Show thinking state
  showThinking() {
    try {
      robotLogger.debug('Showing thinking state');
      if (!this.state.initialized || !this.robotFace) {
        robotLogger.warn('Cannot show thinking state - interface not initialized');
        return;
      }
      
      this.state.thinking = true;
      this.robotFace.startThinking();
    } catch (error) {
      robotLogger.error('Error showing thinking state:', error);
      this.state.thinking = false;
    }
  }
  
  // Hide thinking state
  hideThinking() {
    try {
      robotLogger.debug('Hiding thinking state');
      if (!this.state.initialized || !this.robotFace) {
        robotLogger.warn('Cannot hide thinking state - interface not initialized');
        return;
      }
      
      this.state.thinking = false;
      this.robotFace.stopThinking();
    } catch (error) {
      robotLogger.error('Error hiding thinking state:', error);
      this.state.thinking = false;
    }
  }
  
  // Show an error state
  showError(errorMessage, error = null) {
    robotLogger.error('Robot error:', errorMessage, error);
    
    try {
      // Get full error details if provided
      let errorDetail = '';
      if (error) {
        errorDetail = `${error.message || ''}\n${error.stack || 'No stack trace available'}`;
      }
      
      // Update state
      this.state.error = errorMessage;
      
      // Log to file system if available
      if (this.isElectron && window.api && window.api.logger) {
        try {
          window.api.logger.error(`Robot interface error: ${errorMessage}`, error);
        } catch (logError) {
          console.error('Failed to log error to file:', logError);
        }
      }
      
      // Show error in status container if it exists
      if (this.statusContainer) {
        this.statusContainer.style.display = 'block';
        
        let errorHTML = `<div class="robot-error-message">
          <h3>Robot Interface Error</h3>
          <p>${errorMessage}</p>`;
          
        if (this.options.debug && errorDetail) {
          errorHTML += `<pre class="error-details">${errorDetail}</pre>`;
        }
        
        errorHTML += `<div class="error-actions">
          <button class="error-retry-btn">Retry Initialization</button>
          <button class="error-ignore-btn">Continue Anyway</button>
        </div>`;
        
        errorHTML += '</div>';
        
        this.statusContainer.innerHTML = errorHTML;
        
        // Add event listeners to action buttons if possible
        try {
          const retryBtn = this.statusContainer.querySelector('.error-retry-btn');
          const ignoreBtn = this.statusContainer.querySelector('.error-ignore-btn');
          
          if (retryBtn) {
            retryBtn.addEventListener('click', () => {
              robotLogger.info('Retry initialization requested by user');
              this.statusContainer.style.display = 'none';
              // Attempt to reinitialize components
              this.initComponents();
            });
          }
          
          if (ignoreBtn) {
            ignoreBtn.addEventListener('click', () => {
              robotLogger.info('User chose to continue despite errors');
              this.statusContainer.style.display = 'none';
              // Force initialized state
              this.state.initialized = true;
            });
          }
        } catch (buttonError) {
          robotLogger.error('Failed to set up error action buttons:', buttonError);
        }
      }
      
      // Show error face animation if robot face is initialized
      if (this.robotFace) {
        try {
          robotLogger.debug('Displaying error state on robot face');
          this.robotFace.showError();
        } catch (faceError) {
          robotLogger.error('Failed to show error on robot face:', faceError);
        }
      }
      
      // If speech enabled, announce error
      if (this.options.enableSpeech && this.speechManager) {
        try {
          robotLogger.debug('Announcing error via speech');
          this.speechManager.speak('I encountered an error. Please check the console for details.');
        } catch (speechError) {
          robotLogger.error('Failed to announce error via speech:', speechError);
        }
      }
      
      // Generate diagnostics report for troubleshooting
      try {
        robotLogger.debug('Generating diagnostics report after error');
        const diagnostics = this.getDiagnostics();
        
        if (this.isElectron && window.api && window.api.logger) {
          window.api.logger.info('Robot diagnostics after error', diagnostics);
        }
      } catch (diagError) {
        robotLogger.error('Failed to generate diagnostics after error:', diagError);
      }
    } catch (handlerError) {
      // This is a last resort error handler - if we can't even handle the error properly
      console.error('Critical error: Failed in showError method:', handlerError);
      
      // Try to use alert in extreme cases
      if (this.options.debug && typeof window !== 'undefined' && window.alert) {
        window.alert(`Critical robot interface error: ${errorMessage}\n\nError handler also failed: ${handlerError.message}`);
      }
    }
  }
  
  // Connect to input from user
  processUserInput(text) {
    try {
      robotLogger.debug('Processing user input');
      
      if (!text) {
        robotLogger.warn('Empty user input received');
        return text;
      }
      
      // Add to transcript if enabled
      if (this.options.enableTranscript) {
        try {
          this.addToTranscript('user', text);
        } catch (transcriptError) {
          robotLogger.error('Error adding user message to transcript:', transcriptError);
        }
      }
      
      return text;
    } catch (error) {
      robotLogger.error('Error processing user input:', error);
      return text; // Return original text even if processing fails
    }
  }
  
  // Get diagnostics information about the robot interface
  getDiagnostics() {
    try {
      robotLogger.info('Collecting robot interface diagnostics');
      
      // Get browser details for diagnostics
      const browserDetails = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(', ') : 'N/A',
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        onLine: navigator.onLine,
        webdriver: navigator.webdriver,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth,
          pixelDepth: window.screen.pixelDepth
        },
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        }
      };
      
      // Check for Web Speech API details
      const speechApiDetails = { 
        available: typeof window !== 'undefined' && 'speechSynthesis' in window,
        utteranceAvailable: typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window,
        voicesMethod: typeof window !== 'undefined' && 'speechSynthesis' in window ? 
          (typeof window.speechSynthesis.getVoices === 'function') : false,
        paused: typeof window !== 'undefined' && 'speechSynthesis' in window ? 
          window.speechSynthesis.paused : 'N/A',
        pending: typeof window !== 'undefined' && 'speechSynthesis' in window ? 
          window.speechSynthesis.pending : 'N/A'
      };
      
      // Check SVG support details
      const svgDetails = {
        svgElement: typeof SVGElement !== 'undefined',
        svgNamespace: typeof document !== 'undefined' ? document.createElementNS !== undefined : false,
        svgInnerHTML: (function() {
          try {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            return typeof svg.innerHTML !== 'undefined';
          } catch (e) {
            return false;
          }
        })()
      };
      
      // Collect speech manager detailed diagnostics if available
      let speechManagerDiagnostics = null;
      if (this.speechManager) {
        try {
          speechManagerDiagnostics = {
            state: this.speechManager.getState(),
            config: this.speechManager.getConfig(),
            voices: this.speechManager.getAvailableVoices().map(v => ({
              name: v.name,
              lang: v.lang,
              voiceURI: v.voiceURI,
              localService: v.localService,
              default: v.default
            }))
          };
        } catch (speechError) {
          speechManagerDiagnostics = {
            error: speechError.message,
            errorType: speechError.constructor.name,
            stack: speechError.stack
          };
        }
      }
      
      // Create comprehensive diagnostics object
      const diagnostics = {
        initialized: this.state.initialized,
        error: this.state.error,
        componentStatus: { ...this.state.componentStatus },
        features: { ...this.features },
        isElectron: this.isElectron,
        environment: this.isElectron ? 'Electron' : 'Browser',
        browser: browserDetails,
        svgSupport: svgDetails,
        speechApi: speechApiDetails,
        components: {
          speech: {
            available: !!this.speechManager,
            initialized: this.state.componentStatus.speech,
            config: this.speechManager ? this.speechManager.getConfig() : null,
            state: this.speechManager ? this.speechManager.getState() : null,
            voiceCount: this.speechManager ? (this.speechManager.getAvailableVoices().length || 0) : 0,
            details: speechManagerDiagnostics
          },
          face: {
            available: !!this.robotFace,
            initialized: this.state.componentStatus.face,
            speaking: this.state.speaking,
            thinking: this.state.thinking
          },
          sentiment: {
            available: !!this.sentimentAnalyzer,
            initialized: this.state.componentStatus.sentiment
          }
        },
        options: {
          enableSpeech: this.options.enableSpeech,
          enableTranscript: this.options.enableTranscript,
          enableSentimentAnalysis: this.options.enableSentimentAnalysis
        },
        transcriptMessageCount: this.state.transcript.length,
        timestamp: new Date().toISOString(),
        initTimestamp: this._initTimestamp
      };
      
      // Update debug display if available
      this.updateDebugInfo();
      
      // Log diagnostics to file if available
      if (electronLogger) {
        electronLogger.info('Robot interface diagnostics collected', diagnostics);
        
        // Try to send detailed diagnostics through the IPC channel
        try {
          if (window.api && window.api.logger.logRobotDiagnostics) {
            window.api.logger.logRobotDiagnostics(diagnostics);
          }
        } catch (ipcError) {
          robotLogger.error('Failed to send diagnostics through IPC:', ipcError);
        }
      }
      
      return diagnostics;
    } catch (error) {
      robotLogger.error('Error getting diagnostics:', error);
      return {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        initialized: false,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Clean up resources
  destroy() {
    robotLogger.info('Destroying Claude Robot interface');
    
    try {
      // Clean up robot face
      if (this.robotFace) {
        try {
          robotLogger.debug('Destroying robot face');
          this.robotFace.destroy();
        } catch (faceError) {
          robotLogger.error('Error destroying robot face:', faceError);
        }
      }
      
      // Clean up speech manager
      if (this.speechManager) {
        try {
          robotLogger.debug('Cancelling any active speech');
          this.speechManager.cancel();
        } catch (speechError) {
          robotLogger.error('Error cancelling speech:', speechError);
        }
      }
      
      // Remove DOM elements
      if (this.container && this.mainContainer) {
        try {
          robotLogger.debug('Removing DOM elements');
          this.container.removeChild(this.mainContainer);
        } catch (domError) {
          robotLogger.error('Error removing DOM elements:', domError);
        }
      }
      
      // Clear state
      this.state.initialized = false;
      
      robotLogger.info('Claude Robot interface destroyed');
    } catch (error) {
      robotLogger.error('Error during interface destruction:', error);
    }
  }
}

// Export the ClaudeRobot class
module.exports = ClaudeRobot;