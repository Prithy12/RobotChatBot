/**
 * Speech Manager for Claude Desktop
 * 
 * Handles text-to-speech synthesis with configurable options
 * and synchronization with robot face animations.
 * Contains robust error handling and fallback mechanisms.
 */

class SpeechManager {
  constructor(options = {}) {
    // Logger setup
    this.logger = {
      debug: (message, ...args) => {
        if (options.debug) console.log(`[SpeechManager][DEBUG] ${message}`, ...args);
      },
      info: (message, ...args) => console.log(`[SpeechManager][INFO] ${message}`, ...args),
      warn: (message, ...args) => console.warn(`[SpeechManager][WARNING] ${message}`, ...args),
      error: (message, ...args) => console.error(`[SpeechManager][ERROR] ${message}`, ...args)
    };
    
    this.logger.info('Initializing Speech Manager');
    
    // Default configuration
    this.config = Object.assign({
      voice: null,     // Will be selected from available voices
      rate: 1.0,       // Speech rate (0.1 to 10)
      pitch: 1.0,      // Speech pitch (0 to 2)
      volume: 1.0,     // Speech volume (0 to 1)
      lang: 'en-US',   // Language
      isElectron: false, // Whether running in Electron
      debug: false,    // Debug mode
      maxRetries: 3,   // Max retries for speech operations
      retryDelay: 500  // Delay between retries (ms)
    }, options);
    
    // State tracking
    this.state = {
      initialized: false,
      available: false,
      error: null,
      speaking: false,
      paused: false,
      muted: false,
      currentUtterance: null,
      pendingSpeeches: [],
      selectedVoice: null,
      voicesLoaded: false,
      chromeWorkaround: false,  // Flag for Chrome workaround
      lastSpeechTimestamp: 0,
      speechCount: 0
    };
    
    // Event callbacks
    this.callbacks = {
      onStart: null,
      onEnd: null,
      onPause: null,
      onResume: null,
      onBoundary: null,
      onMark: null,
      onError: null
    };
    
    // Initialize speech synthesis
    try {
      this.init();
    } catch (error) {
      this.logger.error(`Initialization failed: ${error.message}`, error);
      this.state.error = error.message;
    }
  }
  
  /**
   * Initialize the speech synthesis system
   * Tests API availability and sets up voice loading
   */
  init() {
    this.logger.debug('Initializing speech synthesis with feature detection');
    
    try {
      // Comprehensive Web Speech API availability check
      if (typeof window === 'undefined') {
        throw new Error('Window object not available (possibly server-side environment)');
      }
      
      if (!('speechSynthesis' in window)) {
        throw new Error('Speech synthesis not supported in this browser');
      }
      
      if (typeof window.speechSynthesis !== 'object') {
        throw new Error('Speech synthesis object has unexpected type');
      }
      
      if (!('getVoices' in window.speechSynthesis)) {
        throw new Error('Speech synthesis missing required methods');
      }
      
      if (!('SpeechSynthesisUtterance' in window)) {
        throw new Error('SpeechSynthesisUtterance not supported');
      }
      
      // Verify SpeechSynthesisUtterance constructor works
      try {
        const testUtterance = new SpeechSynthesisUtterance('Test');
        if (!(testUtterance instanceof SpeechSynthesisUtterance)) {
          throw new Error('SpeechSynthesisUtterance constructor not working properly');
        }
      } catch (utteranceError) {
        throw new Error(`SpeechSynthesisUtterance error: ${utteranceError.message}`);
      }
      
      // Set API as available if we get here
      this.state.available = true;
      this.logger.info('Speech synthesis API available');
      
      // Detect Chrome for specific workarounds
      const isChrome = navigator.userAgent.indexOf('Chrome') !== -1;
      const isEdge = navigator.userAgent.indexOf('Edg') !== -1;
      if (isChrome && !isEdge) {
        this.logger.debug('Chrome detected, enabling workarounds');
        this.state.chromeWorkaround = true;
      }
      
      // Clear any stuck audio
      this._resetSpeechSynthesis();
      
      // Load voices with retry mechanism
      this._loadVoicesWithRetry();
      
      // Mark as initialized
      this.state.initialized = true;
    } catch (error) {
      this.logger.error(`Speech synthesis initialization failed: ${error.message}`, error);
      this.state.error = error.message;
      this.state.available = false;
      this.state.initialized = false;
      throw error;  // Re-throw to notify caller
    }
  }
  
  /**
   * Reset the speech synthesis to clear any stuck state
   * Helps with Chrome speech synthesis bugs
   */
  _resetSpeechSynthesis() {
    try {
      if (this.state.available) {
        window.speechSynthesis.cancel();
        this.logger.debug('Speech synthesis reset');
      }
    } catch (error) {
      this.logger.error(`Error resetting speech synthesis: ${error.message}`);
    }
  }
  
  /**
   * Load voices with retry mechanism
   * Handles Chrome's asynchronous voice loading
   */
  _loadVoicesWithRetry(attempt = 0) {
    const maxAttempts = 3;
    const retryDelay = 1000;
    
    try {
      // Try to get voices directly first
      let voices = window.speechSynthesis.getVoices();
      
      if (voices && voices.length > 0) {
        this.logger.info(`Voices available (${voices.length}), loading voices`);
        this.loadVoices();
      } else {
        // If no voices and we have attempts left
        if (attempt < maxAttempts) {
          this.logger.debug(`No voices available yet, attempt ${attempt + 1}/${maxAttempts}`);
          
          // For Chrome, set up the onvoiceschanged event
          if ('onvoiceschanged' in window.speechSynthesis) {
            this.logger.debug('Setting up onvoiceschanged event');
            window.speechSynthesis.onvoiceschanged = () => {
              this.logger.info('Voices changed event fired');
              this.loadVoices();
            };
          }
          
          // Retry after delay regardless of browser
          setTimeout(() => {
            this._loadVoicesWithRetry(attempt + 1);
          }, retryDelay);
        } else {
          this.logger.warn(`Failed to load voices after ${maxAttempts} attempts`);
          this.state.error = 'Failed to load voices';
        }
      }
    } catch (error) {
      this.logger.error(`Error in voice loading: ${error.message}`, error);
      this.state.error = `Voice loading error: ${error.message}`;
    }
  }
  
  /**
   * Load and process available voices
   * Sets default voice based on language preference
   */
  loadVoices() {
    try {
      this.logger.debug('Loading available voices');
      
      // Get all available voices
      const availableVoices = window.speechSynthesis.getVoices();
      
      if (!availableVoices || availableVoices.length === 0) {
        this.logger.warn('No voices available for speech synthesis');
        return;
      }
      
      this.logger.info(`Loaded ${availableVoices.length} voices`);
      
      // Try to find the best voice with following preference order:
      // 1. Match default voice name from config if specified
      // 2. Match by en-US language exactly
      // 3. Match by any English language
      // 4. Use first available voice as fallback
      
      let defaultVoice = null;
      
      // 1. Try to match specified default voice
      if (this.config.defaultVoice) {
        this.logger.debug(`Looking for specified default voice: ${this.config.defaultVoice}`);
        defaultVoice = availableVoices.find(voice => 
          voice.name === this.config.defaultVoice || 
          voice.voiceURI === this.config.defaultVoice);
          
        if (defaultVoice) {
          this.logger.debug(`Found specified default voice: ${defaultVoice.name} (${defaultVoice.lang})`);
        }
      }
      
      // 2. Try to match exact en-US language if no default found
      if (!defaultVoice) {
        this.logger.debug('Looking for en-US voice');
        defaultVoice = availableVoices.find(voice => voice.lang === 'en-US');
        
        if (defaultVoice) {
          this.logger.debug(`Found en-US voice: ${defaultVoice.name}`);
        }
      }
      
      // 3. Try to match any English language
      if (!defaultVoice) {
        this.logger.debug('Looking for any English voice');
        defaultVoice = availableVoices.find(voice => voice.lang.includes('en-'));
        
        if (defaultVoice) {
          this.logger.debug(`Found English voice: ${defaultVoice.name} (${defaultVoice.lang})`);
        }
      }
      
      // 4. Fallback to first voice
      if (!defaultVoice && availableVoices.length > 0) {
        defaultVoice = availableVoices[0];
        this.logger.debug(`Using first available voice as fallback: ${defaultVoice.name} (${defaultVoice.lang})`);
      }
      
      // Set the selected voice
      if (defaultVoice) {
        this.state.selectedVoice = defaultVoice;
        this.config.voice = defaultVoice;
        this.state.voicesLoaded = true;
        this.logger.info(`Selected voice: ${defaultVoice.name} (${defaultVoice.lang})`);
      } else {
        // This should never happen if availableVoices.length > 0
        this.logger.error('Failed to select any voice');
        this.state.error = 'No voices available for selection';
      }
    } catch (error) {
      this.logger.error(`Error loading voices: ${error.message}`, error);
      this.state.error = `Voice loading error: ${error.message}`;
    }
  }
  
  /**
   * Check if the speech manager is properly initialized
   * @returns {boolean} True if initialized and available
   */
  isInitialized() {
    return this.state.initialized && this.state.available;
  }
  
  /**
   * Get all available voices from speech synthesis
   * @returns {Array} Array of voice objects
   */
  getAvailableVoices() {
    try {
      // Check API availability
      if (!this.state.available || !('speechSynthesis' in window)) {
        this.logger.warn('Cannot get voices - Speech synthesis not available');
        return [];
      }
      
      const voices = window.speechSynthesis.getVoices();
      return voices || [];
    } catch (error) {
      this.logger.error(`Error getting available voices: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Set the voice to use for speech synthesis
   * @param {string|number} voiceNameOrIndex - Voice name, URI, or index
   * @returns {boolean} Success state
   */
  setVoice(voiceNameOrIndex) {
    try {
      this.logger.debug(`Setting voice to: ${voiceNameOrIndex}`);
      
      // Verify speech synthesis is available
      if (!this.state.available) {
        this.logger.warn('Cannot set voice - Speech synthesis not available');
        return false;
      }
      
      // Get available voices
      const voices = this.getAvailableVoices();
      
      if (voices.length === 0) {
        this.logger.warn('No voices available');
        return false;
      }
      
      let selectedVoice = null;
      
      if (typeof voiceNameOrIndex === 'number') {
        // Select by index
        if (voiceNameOrIndex >= 0 && voiceNameOrIndex < voices.length) {
          selectedVoice = voices[voiceNameOrIndex];
          this.logger.debug(`Selected voice by index ${voiceNameOrIndex}: ${selectedVoice.name}`);
        } else {
          this.logger.warn(`Voice index out of range: ${voiceNameOrIndex}, available: 0-${voices.length - 1}`);
        }
      } else if (typeof voiceNameOrIndex === 'string') {
        // Select by name or URI
        selectedVoice = voices.find(voice => 
          voice.name === voiceNameOrIndex || 
          voice.voiceURI === voiceNameOrIndex);
          
        if (selectedVoice) {
          this.logger.debug(`Selected voice by name: ${selectedVoice.name} (${selectedVoice.lang})`);
        } else {
          this.logger.warn(`Voice not found: ${voiceNameOrIndex}`);
        }
      } else {
        this.logger.warn(`Invalid voice parameter type: ${typeof voiceNameOrIndex}`);
      }
      
      if (selectedVoice) {
        this.state.selectedVoice = selectedVoice;
        this.config.voice = selectedVoice;
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error setting voice: ${error.message}`, error);
      return false;
    }
  }
  
  setRate(rate) {
    if (rate < 0.1) rate = 0.1;
    if (rate > 10) rate = 10;
    
    this.config.rate = rate;
  }
  
  setPitch(pitch) {
    if (pitch < 0) pitch = 0;
    if (pitch > 2) pitch = 2;
    
    this.config.pitch = pitch;
  }
  
  setVolume(volume) {
    if (volume < 0) volume = 0;
    if (volume > 1) volume = 1;
    
    this.config.volume = volume;
  }
  
  setLanguage(langCode) {
    this.config.lang = langCode;
    
    // Try to find a voice that matches the language
    const voices = this.getAvailableVoices();
    const matchingVoice = voices.find(voice => voice.lang.includes(langCode));
    
    if (matchingVoice) {
      this.state.selectedVoice = matchingVoice;
      this.config.voice = matchingVoice;
    }
  }
  
  /**
   * Speak the provided text with speech synthesis
   * @param {string} text - Text to speak
   * @param {Object} options - Speech options to override defaults
   * @returns {boolean} Success state
   */
  speak(text, options = {}) {
    try {
      // Check speech synthesis availability
      if (!this.state.available || !('speechSynthesis' in window)) {
        this.logger.error('Cannot speak - Speech synthesis not available');
        return false;
      }
      
      // Validate text
      if (!text) {
        this.logger.warn('Empty text provided to speak');
        return false;
      }
      
      // Truncate extremely long text (over 5000 chars) to prevent issues
      if (text.length > 5000) {
        this.logger.warn(`Text too long (${text.length} chars), truncating to 5000 chars`);
        text = text.substring(0, 4997) + '...';
      }
      
      this.logger.debug(`Speaking text (${text.length} chars): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Merge default config with provided options
      const speakOptions = Object.assign({}, this.config, options);
      
      // Create utterance with error handling
      let utterance;
      try {
        utterance = new SpeechSynthesisUtterance(text);
      } catch (utteranceError) {
        this.logger.error(`Failed to create utterance: ${utteranceError.message}`);
        return false;
      }
      
      // Set utterance properties
      try {
        // Default to selected voice or any available voice if none selected
        if (!this.state.selectedVoice) {
          const voices = this.getAvailableVoices();
          if (voices.length > 0) {
            this.state.selectedVoice = voices[0];
            this.logger.debug(`No voice was selected, defaulting to first available: ${voices[0].name}`);
          }
        }
        
        utterance.voice = speakOptions.voice || this.state.selectedVoice;
        utterance.rate = speakOptions.rate;
        utterance.pitch = speakOptions.pitch;
        utterance.volume = this.state.muted ? 0 : speakOptions.volume;
        utterance.lang = speakOptions.lang;
      } catch (propertyError) {
        this.logger.error(`Failed to set utterance properties: ${propertyError.message}`);
        // Continue anyway, as some properties might still work
      }
      
      // Set up event listeners with error handling
      try {
        utterance.onstart = (event) => {
          try {
            this.state.speaking = true;
            this.state.lastSpeechTimestamp = Date.now();
            this.logger.debug('Speech started');
            
            if (this.callbacks.onStart) {
              this.callbacks.onStart(utterance);
            }
            
            // For Chrome workaround, set up timeout to resume if speech hangs
            if (this.state.chromeWorkaround) {
              this._setupChromeBugWorkaround();
            }
          } catch (startError) {
            this.logger.error(`Error in onstart handler: ${startError.message}`);
          }
        };
        
        utterance.onend = (event) => {
          try {
            this.state.speaking = false;
            this.state.currentUtterance = null;
            this.state.speechCount++;
            this.logger.debug('Speech ended');
            
            if (this.callbacks.onEnd) {
              this.callbacks.onEnd(utterance);
            }
            
            // If there are pending speeches, play the next one
            if (this.state.pendingSpeeches.length > 0) {
              setTimeout(() => {
                try {
                  if (this.state.pendingSpeeches.length > 0) {
                    const nextSpeech = this.state.pendingSpeeches.shift();
                    this.speak(nextSpeech.text, nextSpeech.options);
                  }
                } catch (nextSpeechError) {
                  this.logger.error(`Error starting next speech: ${nextSpeechError.message}`);
                }
              }, 50); // Small delay to ensure cleanup
            }
          } catch (endError) {
            this.logger.error(`Error in onend handler: ${endError.message}`);
            // Force reset speaking state on error
            this.state.speaking = false;
            this.state.currentUtterance = null;
          }
        };
        
        utterance.onpause = (event) => {
          try {
            this.state.paused = true;
            this.logger.debug('Speech paused');
            
            if (this.callbacks.onPause) {
              this.callbacks.onPause(utterance);
            }
          } catch (pauseError) {
            this.logger.error(`Error in onpause handler: ${pauseError.message}`);
          }
        };
        
        utterance.onresume = (event) => {
          try {
            this.state.paused = false;
            this.logger.debug('Speech resumed');
            
            if (this.callbacks.onResume) {
              this.callbacks.onResume(utterance);
            }
          } catch (resumeError) {
            this.logger.error(`Error in onresume handler: ${resumeError.message}`);
          }
        };
        
        utterance.onboundary = (event) => {
          try {
            if (this.callbacks.onBoundary) {
              this.callbacks.onBoundary(event, utterance);
            }
          } catch (boundaryError) {
            this.logger.error(`Error in onboundary handler: ${boundaryError.message}`);
          }
        };
        
        utterance.onmark = (event) => {
          try {
            if (this.callbacks.onMark) {
              this.callbacks.onMark(event, utterance);
            }
          } catch (markError) {
            this.logger.error(`Error in onmark handler: ${markError.message}`);
          }
        };
        
        utterance.onerror = (event) => {
          try {
            const errorMsg = event.error || 'Unknown speech error';
            this.logger.error(`Speech synthesis error: ${errorMsg}`, event);
            
            this.state.speaking = false;
            this.state.currentUtterance = null;
            
            if (this.callbacks.onError) {
              this.callbacks.onError(event, utterance);
            }
          } catch (errorHandlerError) {
            this.logger.error(`Error in onerror handler: ${errorHandlerError.message}`);
            // Force reset speaking state
            this.state.speaking = false;
            this.state.currentUtterance = null;
          }
        };
      } catch (eventError) {
        this.logger.error(`Failed to set up event listeners: ${eventError.message}`);
        // Continue anyway, as speech might still work
      }
      
      // If already speaking, queue this speech
      if (this.state.speaking) {
        this.logger.debug('Already speaking, queuing speech');
        this.state.pendingSpeeches.push({ text, options: speakOptions });
        return true;
      }
      
      // Reset speech synthesis before speaking (helps with Chrome issues)
      if (this.state.chromeWorkaround) {
        try {
          this.logger.debug('Applying Chrome workaround - resetting speech synthesis');
          window.speechSynthesis.cancel();
        } catch (resetError) {
          this.logger.warn(`Chrome workaround error: ${resetError.message}`);
        }
      }
      
      // Store current utterance and speak
      this.state.currentUtterance = utterance;
      
      try {
        window.speechSynthesis.speak(utterance);
        return true;
      } catch (speakError) {
        this.logger.error(`Error calling speechSynthesis.speak: ${speakError.message}`);
        this.state.speaking = false;
        this.state.currentUtterance = null;
        return false;
      }
    } catch (error) {
      this.logger.error(`Unexpected error in speak method: ${error.message}`, error);
      this.state.speaking = false;
      this.state.currentUtterance = null;
      return false;
    }
  }
  
  /**
   * Workaround for Chrome's speech synthesis timeout bug
   * Chrome stops speaking after ~15 seconds of continuous speech
   */
  _setupChromeBugWorkaround() {
    if (!this.state.chromeWorkaround) return;
    
    try {
      // Clear any existing workaround interval
      if (this._chromeWorkaroundInterval) {
        clearInterval(this._chromeWorkaroundInterval);
      }
      
      // Set up timeout detection
      this._chromeWorkaroundInterval = setInterval(() => {
        try {
          if (this.state.speaking && !this.state.paused) {
            const timeSinceLastEvent = Date.now() - this.state.lastSpeechTimestamp;
            
            // If more than 10 seconds have passed without an event, assume it's stuck
            if (timeSinceLastEvent > 10000) {
              this.logger.warn(`Chrome bug detected - speech appears to be stuck for ${timeSinceLastEvent}ms`);
              
              // First try to resume if paused (Chrome sometimes auto-pauses)
              if (window.speechSynthesis.paused) {
                this.logger.debug('Attempting to resume paused speech');
                window.speechSynthesis.resume();
                this.state.lastSpeechTimestamp = Date.now();
              } else {
                // If not paused, it's likely the 15-second bug. Cancel and restart.
                this.logger.debug('Attempting to restart speech');
                
                // Store current text and position
                const currentText = this.state.currentUtterance ? this.state.currentUtterance.text : null;
                
                if (currentText) {
                  // Cancel current speech
                  window.speechSynthesis.cancel();
                  this.state.speaking = false;
                  this.state.currentUtterance = null;
                  
                  // Restart speech with same text
                  setTimeout(() => {
                    this.logger.debug('Restarting speech after Chrome bug workaround');
                    this.speak(currentText);
                  }, 100);
                }
              }
            }
          }
        } catch (workaroundError) {
          this.logger.error(`Error in Chrome workaround: ${workaroundError.message}`);
        }
      }, 5000); // Check every 5 seconds
    } catch (error) {
      this.logger.error(`Failed to set up Chrome workaround: ${error.message}`);
    }
  }
  
  pause() {
    if (!('speechSynthesis' in window) || !this.state.speaking || this.state.paused) {
      return false;
    }
    
    window.speechSynthesis.pause();
    this.state.paused = true;
    return true;
  }
  
  resume() {
    if (!('speechSynthesis' in window) || !this.state.speaking || !this.state.paused) {
      return false;
    }
    
    window.speechSynthesis.resume();
    this.state.paused = false;
    return true;
  }
  
  cancel() {
    if (!('speechSynthesis' in window)) {
      return false;
    }
    
    window.speechSynthesis.cancel();
    this.state.speaking = false;
    this.state.paused = false;
    this.state.currentUtterance = null;
    this.state.pendingSpeeches = [];
    return true;
  }
  
  mute() {
    this.state.muted = true;
    
    // If currently speaking, update volume to 0
    if (this.state.currentUtterance) {
      this.state.currentUtterance.volume = 0;
    }
  }
  
  unmute() {
    this.state.muted = false;
    
    // If currently speaking, restore volume
    if (this.state.currentUtterance) {
      this.state.currentUtterance.volume = this.config.volume;
    }
  }
  
  toggleMute() {
    if (this.state.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.state.muted;
  }
  
  isSpeaking() {
    return this.state.speaking;
  }
  
  isPaused() {
    return this.state.paused;
  }
  
  isMuted() {
    return this.state.muted;
  }
  
  getConfig() {
    return { ...this.config };
  }
  
  getState() {
    return { ...this.state };
  }
  
  // Set event callbacks
  on(event, callback) {
    if (typeof callback !== 'function') {
      return false;
    }
    
    switch (event) {
      case 'start':
        this.callbacks.onStart = callback;
        break;
      case 'end':
        this.callbacks.onEnd = callback;
        break;
      case 'pause':
        this.callbacks.onPause = callback;
        break;
      case 'resume':
        this.callbacks.onResume = callback;
        break;
      case 'boundary':
        this.callbacks.onBoundary = callback;
        break;
      case 'mark':
        this.callbacks.onMark = callback;
        break;
      case 'error':
        this.callbacks.onError = callback;
        break;
      default:
        return false;
    }
    
    return true;
  }
  
  // Remove event callback
  off(event) {
    switch (event) {
      case 'start':
        this.callbacks.onStart = null;
        break;
      case 'end':
        this.callbacks.onEnd = null;
        break;
      case 'pause':
        this.callbacks.onPause = null;
        break;
      case 'resume':
        this.callbacks.onResume = null;
        break;
      case 'boundary':
        this.callbacks.onBoundary = null;
        break;
      case 'mark':
        this.callbacks.onMark = null;
        break;
      case 'error':
        this.callbacks.onError = null;
        break;
      default:
        return false;
    }
    
    return true;
  }
}

// Export the SpeechManager class
module.exports = SpeechManager;