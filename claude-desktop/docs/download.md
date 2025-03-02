---
layout: default
title: Download RobotChatBot
---

# Download RobotChatBot

An AI-powered desktop assistant with an interactive robot interface.

## Choose your platform

RobotChatBot is available for Windows, macOS, and Linux. Select your operating system below to download the latest version.

<div class="download-buttons">
  <a href="https://github.com/Prithy12/RobotChatBot/releases/latest/download/Claude-Desktop-Setup-1.0.0.exe" class="download-button" id="windows-download">
    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Windows_logo_-_2012.svg" alt="Windows logo">
    Windows
  </a>
  <a href="https://github.com/Prithy12/RobotChatBot/releases/latest/download/Claude-Desktop-1.0.0.dmg" class="download-button" id="mac-download">
    <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple logo">
    macOS
  </a>
  <a href="https://github.com/Prithy12/RobotChatBot/releases/latest/download/claude-desktop-1.0.0.AppImage" class="download-button" id="linux-download">
    <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" alt="Linux logo">
    Linux
  </a>
</div>

Current version: 1.0.0

## Download Source Code

For developers or users who want to run from source:

<div class="download-buttons">
  <a href="https://github.com/Prithy12/RobotChatBot/archive/refs/heads/main.zip" class="download-button source">
    Download Source ZIP
  </a>
</div>

## Installation Instructions

### <img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Windows_logo_-_2012.svg" alt="Windows logo" style="width:24px; margin-right:10px;"> Windows

1. Download the Windows installer (.exe file)
2. Double-click the installer and follow the on-screen instructions
3. RobotChatBot will launch automatically after installation

### <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple logo" style="width:24px; margin-right:10px;"> macOS

1. Download the macOS installer (.dmg file)
2. Open the .dmg file and drag RobotChatBot to your Applications folder
3. Launch RobotChatBot from your Applications folder or Launchpad
4. If you get a security warning, right-click on the app and select "Open"

### <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" alt="Linux logo" style="width:24px; margin-right:10px;"> Linux

1. Download the Linux AppImage file
2. Make the AppImage executable with: `chmod +x robotchatbot-*.AppImage`
3. Run the AppImage by double-clicking it or with: `./robotchatbot-*.AppImage`

---

## Running from Source Code

1. **Download the ZIP file** using the Source Code button above
2. **Extract the ZIP file** to a folder on your computer
3. **Navigate to either environment**:
   - For production: go to `environments/prod/` folder
   - For development: go to `environments/dev/` folder
4. **Run the start.cmd file** (Windows) or **start.sh** (macOS/Linux) in that directory. It will:
   - Install all required dependencies
   - Build the application automatically
   - Launch the application
5. When prompted, **enter your Claude API key**. You can get an API key from [Anthropic's Console](https://console.anthropic.com/).

## System Requirements

- **Windows:** Windows 10 or later
- **macOS:** macOS 10.13 (High Sierra) or later
- **Linux:** Ubuntu 18.04 or equivalent
- **RAM:** 4 GB minimum
- **Disk space:** 500 MB available space
- **Internet connection:** Required for API access

---

RobotChatBot is an open-source project. [View on GitHub](https://github.com/Prithy12/RobotChatBot)

[← Back to Home](index.html)

<script>
  // Detect the user's OS and highlight the appropriate download button
  document.addEventListener('DOMContentLoaded', function() {
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      document.getElementById('windows-download').style.backgroundColor = '#28a745';
    } else if (platform.includes('mac')) {
      document.getElementById('mac-download').style.backgroundColor = '#28a745';
    } else if (platform.includes('linux')) {
      document.getElementById('linux-download').style.backgroundColor = '#28a745';
    }
  });
</script>