const { app } = require('electron');
const keytar = require('keytar');
const Store = require('electron-store');

// Service and account names used in the application
const SERVICE_NAME = 'com.anthropic.claude';
const ACCOUNT_NAME = 'api-key';

// Initialize encrypted store
const store = new Store({
  name: 'claude-settings',
  encryptionKey: 'claude-desktop-storage-key'
});

async function cleanApiKey() {
  try {
    console.log('Attempting to remove API key from system keychain...');
    
    // Remove from keytar (system keychain)
    await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    console.log('API key removed from system keychain.');
    
    // Remove from electron-store (encrypted local storage)
    if (store.has('apiKey')) {
      store.delete('apiKey');
      console.log('API key removed from encrypted local storage.');
    } else {
      console.log('No API key found in encrypted local storage.');
    }
    
    console.log('API key removal complete.');
  } catch (error) {
    console.error('Error removing API key:', error);
  }
}

// Run the cleanup
app.whenReady().then(() => {
  cleanApiKey().then(() => {
    app.quit();
  });
});