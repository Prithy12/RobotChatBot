---
layout: default
---

# RobotChatBot

An AI-powered desktop assistant featuring Claude with an interactive robot interface.

## Download RobotChatBot

Choose your platform to download the latest version:

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

[View detailed download options](download.html)

## Features

- 🖥️ **Cross-Platform**: Runs on Windows, macOS, and Linux
- 🎭 **Expressive Robot Interface**: Robot face displays different expressions based on conversation sentiment
- 🔊 **Text-to-Speech**: Responses can be read aloud with natural-sounding voice synthesis
- 🔒 **Secure API Key Storage**: Keys stored securely using system keychain with encrypted fallback
- 🌓 **Light & Dark Mode**: Choose between light and dark themes, or follow your system preferences

## System Requirements

- **Windows:** Windows 10 or later
- **macOS:** macOS 10.13 (High Sierra) or later
- **Linux:** Ubuntu 18.04 or equivalent
- **RAM:** 4 GB minimum
- **Disk space:** 500 MB available space
- **Internet connection:** Required for API access

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