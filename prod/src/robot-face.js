/**
 * Robot Face Animation Component for Claude Desktop
 * 
 * Implements an animated SVG robot face that responds to Claude's outputs
 * with synchronized facial expressions, mouth movements and emotion displays.
 */

class RobotFace {
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      width: 400,
      height: 400,
      primaryColor: '#8A7CFF',
      secondaryColor: '#B19FFF',
      backgroundColor: '#23252F',
      eyeColor: '#8A7CFF',
      speakingColor: '#5EB3FF',
      thinkingColor: '#FFB84D',
      errorColor: '#FF5E5E'
    }, options);

    this.state = {
      speaking: false,
      thinking: false,
      emotion: 'neutral', // neutral, happy, sad, confused, surprised
      blinking: false,
      eyeSize: 1.0,
      mouthOpenness: 0,
      ledActive: false
    };

    this.animations = {
      blinkInterval: null,
      mouthInterval: null,
      emotionTimeout: null,
      ledInterval: null
    };

    this.init();
  }

  init() {
    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', this.options.width);
    this.svg.setAttribute('height', this.options.height);
    this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.setAttribute('class', 'robot-face');
    
    // Create robot face components
    this.createFace();
    
    // Add SVG to container
    this.container.appendChild(this.svg);
    
    // Start animations
    this.startBlinking();
  }

  createFace() {
    // Face background
    this.faceBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.faceBackground.setAttribute('x', '10');
    this.faceBackground.setAttribute('y', '10');
    this.faceBackground.setAttribute('width', '80');
    this.faceBackground.setAttribute('height', '80');
    this.faceBackground.setAttribute('rx', '15');
    this.faceBackground.setAttribute('ry', '15');
    this.faceBackground.setAttribute('fill', this.options.backgroundColor);
    this.faceBackground.setAttribute('stroke', this.options.primaryColor);
    this.faceBackground.setAttribute('stroke-width', '2');
    this.svg.appendChild(this.faceBackground);
    
    // Create face plate details
    this.createFacePlateDetails();
    
    // Create eyes
    this.createEyes();
    
    // Create mouth
    this.createMouth();
    
    // Create LEDs
    this.createLEDs();
  }

  createFacePlateDetails() {
    // Top vent
    const topVent = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    topVent.setAttribute('x', '25');
    topVent.setAttribute('y', '15');
    topVent.setAttribute('width', '50');
    topVent.setAttribute('height', '3');
    topVent.setAttribute('rx', '1');
    topVent.setAttribute('ry', '1');
    topVent.setAttribute('fill', this.options.primaryColor);
    topVent.setAttribute('opacity', '0.5');
    this.svg.appendChild(topVent);
    
    // Bottom detail line
    const bottomLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    bottomLine.setAttribute('x1', '20');
    bottomLine.setAttribute('y1', '82');
    bottomLine.setAttribute('x2', '80');
    bottomLine.setAttribute('y2', '82');
    bottomLine.setAttribute('stroke', this.options.primaryColor);
    bottomLine.setAttribute('stroke-width', '0.5');
    bottomLine.setAttribute('opacity', '0.7');
    this.svg.appendChild(bottomLine);
    
    // Left side detail
    const leftDetail = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    leftDetail.setAttribute('x', '14');
    leftDetail.setAttribute('y', '30');
    leftDetail.setAttribute('width', '2');
    leftDetail.setAttribute('height', '40');
    leftDetail.setAttribute('fill', this.options.primaryColor);
    leftDetail.setAttribute('opacity', '0.3');
    this.svg.appendChild(leftDetail);
    
    // Right side detail
    const rightDetail = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rightDetail.setAttribute('x', '84');
    rightDetail.setAttribute('y', '30');
    rightDetail.setAttribute('width', '2');
    rightDetail.setAttribute('height', '40');
    rightDetail.setAttribute('fill', this.options.primaryColor);
    rightDetail.setAttribute('opacity', '0.3');
    this.svg.appendChild(rightDetail);
  }

  createEyes() {
    // Eye group
    this.eyeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.eyeGroup);
    
    // Left eye socket
    const leftEyeSocket = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    leftEyeSocket.setAttribute('x', '25');
    leftEyeSocket.setAttribute('y', '30');
    leftEyeSocket.setAttribute('width', '18');
    leftEyeSocket.setAttribute('height', '12');
    leftEyeSocket.setAttribute('rx', '3');
    leftEyeSocket.setAttribute('ry', '3');
    leftEyeSocket.setAttribute('fill', '#16171E');
    leftEyeSocket.setAttribute('stroke', this.options.primaryColor);
    leftEyeSocket.setAttribute('stroke-width', '1');
    this.eyeGroup.appendChild(leftEyeSocket);
    
    // Right eye socket
    const rightEyeSocket = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rightEyeSocket.setAttribute('x', '57');
    rightEyeSocket.setAttribute('y', '30');
    rightEyeSocket.setAttribute('width', '18');
    rightEyeSocket.setAttribute('height', '12');
    rightEyeSocket.setAttribute('rx', '3');
    rightEyeSocket.setAttribute('ry', '3');
    rightEyeSocket.setAttribute('fill', '#16171E');
    rightEyeSocket.setAttribute('stroke', this.options.primaryColor);
    rightEyeSocket.setAttribute('stroke-width', '1');
    this.eyeGroup.appendChild(rightEyeSocket);
    
    // Left eye
    this.leftEye = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.leftEye.setAttribute('x', '30');
    this.leftEye.setAttribute('y', '33');
    this.leftEye.setAttribute('width', '8');
    this.leftEye.setAttribute('height', '6');
    this.leftEye.setAttribute('rx', '1');
    this.leftEye.setAttribute('ry', '1');
    this.leftEye.setAttribute('fill', this.options.eyeColor);
    this.eyeGroup.appendChild(this.leftEye);
    
    // Right eye
    this.rightEye = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.rightEye.setAttribute('x', '62');
    this.rightEye.setAttribute('y', '33');
    this.rightEye.setAttribute('width', '8');
    this.rightEye.setAttribute('height', '6');
    this.rightEye.setAttribute('rx', '1');
    this.rightEye.setAttribute('ry', '1');
    this.rightEye.setAttribute('fill', this.options.eyeColor);
    this.eyeGroup.appendChild(this.rightEye);
  }

  createMouth() {
    // Mouth group
    this.mouthGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.mouthGroup);
    
    // Mouth background
    this.mouthBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.mouthBackground.setAttribute('x', '30');
    this.mouthBackground.setAttribute('y', '55');
    this.mouthBackground.setAttribute('width', '40');
    this.mouthBackground.setAttribute('height', '15');
    this.mouthBackground.setAttribute('rx', '3');
    this.mouthBackground.setAttribute('ry', '3');
    this.mouthBackground.setAttribute('fill', '#16171E');
    this.mouthBackground.setAttribute('stroke', this.options.primaryColor);
    this.mouthBackground.setAttribute('stroke-width', '1');
    this.mouthGroup.appendChild(this.mouthBackground);
    
    // Mouth grid lines (to look like a speaker)
    for (let i = 0; i < 3; i++) {
      const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      horizontalLine.setAttribute('x1', '32');
      horizontalLine.setAttribute('y1', (60 + i * 3).toString());
      horizontalLine.setAttribute('x2', '68');
      horizontalLine.setAttribute('y2', (60 + i * 3).toString());
      horizontalLine.setAttribute('stroke', this.options.primaryColor);
      horizontalLine.setAttribute('stroke-width', '0.5');
      horizontalLine.setAttribute('opacity', '0.5');
      this.mouthGroup.appendChild(horizontalLine);
    }
    
    for (let i = 0; i < 5; i++) {
      const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      verticalLine.setAttribute('x1', (37 + i * 7).toString());
      verticalLine.setAttribute('y1', '57');
      verticalLine.setAttribute('x2', (37 + i * 7).toString());
      verticalLine.setAttribute('y2', '68');
      verticalLine.setAttribute('stroke', this.options.primaryColor);
      verticalLine.setAttribute('stroke-width', '0.5');
      verticalLine.setAttribute('opacity', '0.5');
      this.mouthGroup.appendChild(verticalLine);
    }
    
    // Mouth speaker animation element
    this.mouthSpeaker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.mouthSpeaker.setAttribute('x', '35');
    this.mouthSpeaker.setAttribute('y', '59');
    this.mouthSpeaker.setAttribute('width', '30');
    this.mouthSpeaker.setAttribute('height', '7');
    this.mouthSpeaker.setAttribute('rx', '1');
    this.mouthSpeaker.setAttribute('ry', '1');
    this.mouthSpeaker.setAttribute('fill', this.options.primaryColor);
    this.mouthSpeaker.setAttribute('opacity', '0');
    this.mouthGroup.appendChild(this.mouthSpeaker);
  }

  createLEDs() {
    // LED group
    this.ledGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.ledGroup);
    
    // LED background
    const ledBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    ledBackground.setAttribute('x', '25');
    ledBackground.setAttribute('y', '75');
    ledBackground.setAttribute('width', '50');
    ledBackground.setAttribute('height', '5');
    ledBackground.setAttribute('rx', '2');
    ledBackground.setAttribute('ry', '2');
    ledBackground.setAttribute('fill', '#16171E');
    ledBackground.setAttribute('stroke', this.options.primaryColor);
    ledBackground.setAttribute('stroke-width', '0.5');
    ledBackground.setAttribute('opacity', '0.7');
    this.ledGroup.appendChild(ledBackground);
    
    // Create individual LEDs
    this.leds = [];
    for (let i = 0; i < 5; i++) {
      const led = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      led.setAttribute('cx', (30 + i * 10).toString());
      led.setAttribute('cy', '77.5');
      led.setAttribute('r', '1.5');
      led.setAttribute('fill', this.options.primaryColor);
      led.setAttribute('opacity', '0.3');
      this.ledGroup.appendChild(led);
      this.leds.push(led);
    }
  }

  startBlinking() {
    // Stop any existing blink animation
    if (this.animations.blinkInterval) {
      clearInterval(this.animations.blinkInterval);
    }
    
    // Set up blink interval
    this.animations.blinkInterval = setInterval(() => {
      this.blink();
    }, 3000 + Math.random() * 4000); // Random blink interval between 3-7 seconds
  }

  blink() {
    if (this.state.blinking) return;
    
    this.state.blinking = true;
    
    // Store original heights
    const leftHeight = parseFloat(this.leftEye.getAttribute('height'));
    const rightHeight = parseFloat(this.rightEye.getAttribute('height'));
    const leftY = parseFloat(this.leftEye.getAttribute('y'));
    const rightY = parseFloat(this.rightEye.getAttribute('y'));
    
    // Close eyes (make them thin)
    this.leftEye.setAttribute('height', '1');
    this.rightEye.setAttribute('height', '1');
    this.leftEye.setAttribute('y', leftY + 2.5);
    this.rightEye.setAttribute('y', rightY + 2.5);
    
    // Reopen after a short delay
    setTimeout(() => {
      this.leftEye.setAttribute('height', leftHeight);
      this.rightEye.setAttribute('height', rightHeight);
      this.leftEye.setAttribute('y', leftY);
      this.rightEye.setAttribute('y', rightY);
      this.state.blinking = false;
    }, 150);
  }

  startSpeaking() {
    if (this.state.speaking) return;
    
    this.state.speaking = true;
    
    // Stop any existing mouth animation
    if (this.animations.mouthInterval) {
      clearInterval(this.animations.mouthInterval);
    }
    
    // Change eye color to speaking color
    this.leftEye.setAttribute('fill', this.options.speakingColor);
    this.rightEye.setAttribute('fill', this.options.speakingColor);
    
    // Start mouth animation
    let mouthOpenness = 0;
    let direction = 1;
    
    this.animations.mouthInterval = setInterval(() => {
      mouthOpenness += 0.1 * direction;
      
      if (mouthOpenness >= 1) {
        direction = -1;
      } else if (mouthOpenness <= 0) {
        direction = 1;
      }
      
      this.mouthSpeaker.setAttribute('opacity', (0.3 + mouthOpenness * 0.7).toString());
      this.mouthSpeaker.setAttribute('height', (3 + mouthOpenness * 4).toString());
      this.mouthSpeaker.setAttribute('y', (63 - mouthOpenness * 2).toString());
    }, 50);
    
    // Start LED animation
    this.startLEDAnimation();
  }

  stopSpeaking() {
    if (!this.state.speaking) return;
    
    this.state.speaking = false;
    
    // Reset eye color
    this.leftEye.setAttribute('fill', this.options.eyeColor);
    this.rightEye.setAttribute('fill', this.options.eyeColor);
    
    // Stop mouth animation
    if (this.animations.mouthInterval) {
      clearInterval(this.animations.mouthInterval);
      this.animations.mouthInterval = null;
    }
    
    // Reset mouth
    this.mouthSpeaker.setAttribute('opacity', '0');
    
    // Stop LED animation
    this.stopLEDAnimation();
  }

  startThinking() {
    if (this.state.thinking) return;
    
    this.state.thinking = true;
    
    // Change eye color to thinking color
    this.leftEye.setAttribute('fill', this.options.thinkingColor);
    this.rightEye.setAttribute('fill', this.options.thinkingColor);
    
    // Start LED animation
    this.startLEDAnimation();
  }

  stopThinking() {
    if (!this.state.thinking) return;
    
    this.state.thinking = false;
    
    // Reset eye color
    this.leftEye.setAttribute('fill', this.options.eyeColor);
    this.rightEye.setAttribute('fill', this.options.eyeColor);
    
    // Stop LED animation
    this.stopLEDAnimation();
  }

  setEmotion(emotion) {
    // Clear any existing emotion timeout
    if (this.animations.emotionTimeout) {
      clearTimeout(this.animations.emotionTimeout);
    }
    
    this.state.emotion = emotion;
    
    // Adjust eye shapes based on emotion
    switch (emotion) {
      case 'happy':
        // Make eyes more curved/upturned
        this.leftEye.setAttribute('rx', '2');
        this.rightEye.setAttribute('rx', '2');
        this.leftEye.setAttribute('width', '10');
        this.rightEye.setAttribute('width', '10');
        break;
        
      case 'sad':
        // Make eyes more downturned
        this.leftEye.setAttribute('rx', '1');
        this.rightEye.setAttribute('rx', '1');
        this.leftEye.setAttribute('width', '6');
        this.rightEye.setAttribute('width', '6');
        break;
        
      case 'confused':
        // Make eyes asymmetrical
        this.leftEye.setAttribute('width', '6');
        this.rightEye.setAttribute('width', '10');
        break;
        
      case 'surprised':
        // Make eyes wider
        this.leftEye.setAttribute('width', '12');
        this.rightEye.setAttribute('width', '12');
        this.leftEye.setAttribute('height', '8');
        this.rightEye.setAttribute('height', '8');
        break;
        
      case 'neutral':
      default:
        // Reset to default eye shape
        this.leftEye.setAttribute('rx', '1');
        this.rightEye.setAttribute('rx', '1');
        this.leftEye.setAttribute('width', '8');
        this.rightEye.setAttribute('width', '8');
        this.leftEye.setAttribute('height', '6');
        this.rightEye.setAttribute('height', '6');
        break;
    }
    
    // Return to neutral after a delay
    this.animations.emotionTimeout = setTimeout(() => {
      this.setEmotion('neutral');
    }, 5000);
  }

  showError() {
    // Change eye color to error color
    this.leftEye.setAttribute('fill', this.options.errorColor);
    this.rightEye.setAttribute('fill', this.options.errorColor);
    
    // Show X pattern in eyes
    const leftX1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftX1.setAttribute('x1', '28');
    leftX1.setAttribute('y1', '31');
    leftX1.setAttribute('x2', '40');
    leftX1.setAttribute('y2', '41');
    leftX1.setAttribute('stroke', '#FFFFFF');
    leftX1.setAttribute('stroke-width', '1.5');
    this.eyeGroup.appendChild(leftX1);
    
    const leftX2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftX2.setAttribute('x1', '40');
    leftX2.setAttribute('y1', '31');
    leftX2.setAttribute('x2', '28');
    leftX2.setAttribute('y2', '41');
    leftX2.setAttribute('stroke', '#FFFFFF');
    leftX2.setAttribute('stroke-width', '1.5');
    this.eyeGroup.appendChild(leftX2);
    
    const rightX1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightX1.setAttribute('x1', '60');
    rightX1.setAttribute('y1', '31');
    rightX1.setAttribute('x2', '72');
    rightX1.setAttribute('y2', '41');
    rightX1.setAttribute('stroke', '#FFFFFF');
    rightX1.setAttribute('stroke-width', '1.5');
    this.eyeGroup.appendChild(rightX1);
    
    const rightX2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightX2.setAttribute('x1', '72');
    rightX2.setAttribute('y1', '31');
    rightX2.setAttribute('x2', '60');
    rightX2.setAttribute('y2', '41');
    rightX2.setAttribute('stroke', '#FFFFFF');
    rightX2.setAttribute('stroke-width', '1.5');
    this.eyeGroup.appendChild(rightX2);
    
    // Flash LEDs in error pattern
    this.leds.forEach((led) => {
      led.setAttribute('fill', this.options.errorColor);
      led.setAttribute('opacity', '1');
    });
    
    // Reset after 3 seconds
    setTimeout(() => {
      // Remove X pattern
      this.eyeGroup.removeChild(leftX1);
      this.eyeGroup.removeChild(leftX2);
      this.eyeGroup.removeChild(rightX1);
      this.eyeGroup.removeChild(rightX2);
      
      // Reset eye color
      this.leftEye.setAttribute('fill', this.options.eyeColor);
      this.rightEye.setAttribute('fill', this.options.eyeColor);
      
      // Reset LEDs
      this.leds.forEach((led) => {
        led.setAttribute('fill', this.options.primaryColor);
        led.setAttribute('opacity', '0.3');
      });
    }, 3000);
  }

  startLEDAnimation() {
    // Stop any existing LED animation
    if (this.animations.ledInterval) {
      clearInterval(this.animations.ledInterval);
    }
    
    let ledIndex = 0;
    
    this.animations.ledInterval = setInterval(() => {
      // Reset all LEDs
      this.leds.forEach((led, index) => {
        if (index === ledIndex) {
          led.setAttribute('opacity', '1');
        } else {
          led.setAttribute('opacity', '0.3');
        }
      });
      
      ledIndex = (ledIndex + 1) % this.leds.length;
    }, 200);
  }

  stopLEDAnimation() {
    // Stop LED animation
    if (this.animations.ledInterval) {
      clearInterval(this.animations.ledInterval);
      this.animations.ledInterval = null;
    }
    
    // Reset all LEDs
    this.leds.forEach((led) => {
      led.setAttribute('opacity', '0.3');
    });
  }

  // Clean up all animations
  destroy() {
    // Clear all animation intervals and timeouts
    if (this.animations.blinkInterval) clearInterval(this.animations.blinkInterval);
    if (this.animations.mouthInterval) clearInterval(this.animations.mouthInterval);
    if (this.animations.emotionTimeout) clearTimeout(this.animations.emotionTimeout);
    if (this.animations.ledInterval) clearInterval(this.animations.ledInterval);
    
    // Remove the SVG from the container
    this.container.removeChild(this.svg);
  }
}

// Export the RobotFace class
module.exports = RobotFace;