/**
 * Configuration file for Claude Desktop
 * Centralizes configuration settings for easier management
 */

const path = require('path');
const { app } = require('electron');

// Determine the base path for resources
// This differs between development and production modes
const isPackaged = app ? app.isPackaged : false;
const basePath = isPackaged ? 
  process.resourcesPath : // Use when packaged as ASAR
  path.join(__dirname, '..'); // Use in development

const config = {
  // Application settings
  appName: 'Claude Desktop',
  appVersion: '1.0.0',
  apiEndpoint: 'https://api.anthropic.com/v1/messages',
  
  // Paths - automatically adjusted for Windows when packaged
  paths: {
    assets: path.join(basePath, 'assets'),
    robotFace: path.join(basePath, 'assets', 'robot'),
    sounds: path.join(basePath, 'assets', 'sounds'),
    icons: path.join(basePath, 'assets', 'icons'),
  },
  
  // Robot interface settings
  robot: {
    defaultVoice: 'en-US',
    defaultSpeechRate: 1.0,
    defaultVolume: 0.8,
    enableAnimations: true,
    enableSpeech: true,
    autoSentimentAnalysis: true,
  },
  
  // UI settings
  ui: {
    defaultTheme: 'light',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    messageHistoryLimit: 100,
  }
};

module.exports = config;