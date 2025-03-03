/**
 * Claude Robot Interface Example
 * 
 * Example of how to integrate the Claude Robot interface into an Electron application
 * with fallback support and error handling.
 */

// Import the Claude Robot class
const ClaudeRobot = require('./claude-robot');

// Example initialization function to set up the robot interface
function initializeRobotInterface(container, apiKey) {
  console.log('Initializing Claude Robot interface...');
  
  // Track initialization status
  let robotInitialized = false;
  let robot = null;
  
  try {
    // Feature detection to determine if we should use fallback mode
    const shouldUseFallbacks = !detectSvgSupport() || !detectWebSpeechSupport();
    
    // Initialize the robot with options
    robot = new ClaudeRobot(container, {
      apiKey: apiKey,
      enableSpeech: true,
      enableTranscript: true,
      enableSentimentAnalysis: true,
      fallbackMode: shouldUseFallbacks, // Automatically use fallbacks if needed
      debug: true, // Enable verbose logging
      
      // Callback for switching between robot and chat views
      onToggleView: () => {
        console.log('User requested interface toggle');
        // Code to switch back to traditional chat interface
        // Your app-specific implementation here
      },
      
      // Face customization options
      faceOptions: {
        primaryColor: '#8A7CFF',
        backgroundColor: '#23252F',
        eyeColor: '#8A7CFF',
        speakingColor: '#5EB3FF',
        thinkingColor: '#FFB84D',
        errorColor: '#FF5E5E'
      },
      
      // Speech customization options
      speechOptions: {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
        lang: 'en-US'
      }
    });
    
    // Check initialization status
    if (robot && robot.state.initialized) {
      robotInitialized = true;
      console.log('Robot interface successfully initialized');
      
      // If using fallbacks, log which ones
      if (robot.state.usingFallbacks.overall) {
        console.log('Using compatibility mode components:');
        console.log(`- Face: ${robot.state.usingFallbacks.face ? 'Simplified' : 'Full'}`);
        console.log(`- Speech: ${robot.state.usingFallbacks.speech ? 'Simplified' : 'Full'}`);
      }
      
      // Display a welcome message
      setTimeout(() => {
        if (robot) {
          robot.processClaudeResponse("Hello! I'm Claude. My robot interface is now ready. Try asking me a question!");
        }
      }, 1000);
    } else {
      console.error('Robot interface initialization reported failure');
      if (robot && robot.state.error) {
        console.error('Initialization error:', robot.state.error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize robot interface:', error);
    robotInitialized = false;
    
    // Display error message in container
    try {
      container.innerHTML = '';
      const errorMessage = document.createElement('div');
      errorMessage.style.padding = '20px';
      errorMessage.style.backgroundColor = '#ffdddd';
      errorMessage.style.border = '1px solid #ff0000';
      errorMessage.style.borderRadius = '5px';
      errorMessage.style.margin = '10px';
      errorMessage.innerHTML = `<h3>Robot Interface Error</h3><p>${error.message}</p>`;
      container.appendChild(errorMessage);
    } catch (displayError) {
      console.error('Failed to display error message:', displayError);
    }
  }
  
  return {
    robot,
    initialized: robotInitialized,
    
    // Method to process a message when the user submits text
    sendMessage: async (text) => {
      if (!robot || !robotInitialized) {
        console.error('Cannot send message - robot interface not initialized');
        return null;
      }
      
      try {
        // Process user input (adds to transcript, etc)
        robot.processUserInput(text);
        
        // Show thinking state
        robot.showThinking();
        
        // Call your API here and get the response
        // Example:
        // const response = await callClaudeAPI(apiKey, text);
        
        // For demo purposes, we'll simulate an API response after a delay
        return new Promise((resolve) => {
          setTimeout(() => {
            // Hide thinking state
            robot.hideThinking();
            
            // Create a simulated response
            const simulatedResponse = generateSimulatedResponse(text);
            
            // Process Claude's response (sentiment analysis, speech, etc)
            robot.processClaudeResponse(simulatedResponse);
            
            resolve(simulatedResponse);
          }, 1500); // Simulate API delay
        });
      } catch (error) {
        console.error('Error sending message:', error);
        robot.hideThinking();
        robot.showError(`Failed to send message: ${error.message}`);
        return null;
      }
    },
    
    // Method to destroy the robot interface
    destroy: () => {
      try {
        if (robot) {
          robot.destroy();
          robot = null;
          robotInitialized = false;
          console.log('Robot interface destroyed');
        }
      } catch (error) {
        console.error('Error destroying robot interface:', error);
      }
    },
    
    // Method to get diagnostic information
    getDiagnostics: () => {
      if (!robot) {
        return { initialized: false, error: 'Robot interface not created' };
      }
      return robot.getDiagnostics();
    }
  };
}

// Helper function to detect SVG support
function detectSvgSupport() {
  try {
    return typeof SVGElement !== 'undefined' && 
           document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
  } catch (error) {
    console.error('Error detecting SVG support:', error);
    return false;
  }
}

// Helper function to detect Web Speech API support
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

// Helper function to simulate Claude API responses (for demo purposes)
function generateSimulatedResponse(userInput) {
  const inputLower = userInput.toLowerCase();
  
  // Simple response patterns
  if (inputLower.includes('hello') || inputLower.includes('hi ')) {
    return "Hello there! I'm Claude, your AI assistant. How can I help you today?";
  } else if (inputLower.includes('how are you')) {
    return "I'm doing well, thank you for asking! I'm here and ready to assist you with whatever you need.";
  } else if (inputLower.includes('your name')) {
    return "My name is Claude. I'm an AI assistant created by Anthropic to be helpful, harmless, and honest.";
  } else if (inputLower.includes('happy')) {
    return "That's wonderful to hear! Positive emotions like happiness are so important for wellbeing. I'm glad you're feeling good today!";
  } else if (inputLower.includes('sad')) {
    return "I'm sorry to hear that. It's natural to feel down sometimes. Is there anything specific that's bothering you that I might be able to help with?";
  } else if (inputLower.includes('angry')) {
    return "I understand feeling frustrated or angry can be challenging. Sometimes taking a deep breath and addressing the root cause can help manage those feelings.";
  } else if (inputLower.includes('surprise') || inputLower.includes('wow')) {
    return "Amazing, isn't it? Sometimes life is full of unexpected moments that can leave us in awe or surprise!";
  } else if (inputLower.includes('confus')) {
    return "I can understand why that might be confusing. Would you like me to explain it in a different way or provide more details to help clarify things?";
  } else {
    // Default response
    return `I appreciate your message. As a robot assistant, I'm programmed to respond to your queries and help in any way I can. Is there something specific you'd like to know more about?`;
  }
}

// Example usage (to be used in the renderer process of an Electron app)
function exampleUsage() {
  // Get the container element
  const container = document.getElementById('robot-container');
  
  // Initialize the robot interface
  const robotInterface = initializeRobotInterface(container, 'your-api-key');
  
  // Example of sending a message
  const sendButton = document.getElementById('send-button');
  const inputField = document.getElementById('message-input');
  
  sendButton.addEventListener('click', async () => {
    const text = inputField.value.trim();
    if (text) {
      inputField.value = '';
      const response = await robotInterface.sendMessage(text);
      console.log('Received response:', response);
    }
  });
  
  // Example of destroying the interface when switching views
  const toggleButton = document.getElementById('toggle-view-button');
  toggleButton.addEventListener('click', () => {
    robotInterface.destroy();
    
    // Your code to switch to another view...
  });
}

// Export the initialization function
module.exports = {
  initializeRobotInterface
};