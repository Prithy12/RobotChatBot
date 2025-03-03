const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * API Key Cleaner Utility
 * 
 * This tool removes any stored API keys from both dev and prod environments
 * It targets both the system keychain (if available) and encrypted config files
 */

// Try to require keytar for secure credential deletion
function tryRequireKeytar() {
  try {
    return require('keytar');
  } catch (error) {
    console.log('Keytar module not available, only resetting config files');
    return null;
  }
}

// Get possible appData locations for each environment
function getAppDataLocations() {
  const platform = process.platform;
  const defaultLocations = [];
  
  if (platform === 'win32') {
    // Main app location
    defaultLocations.push(path.join(os.homedir(), 'AppData', 'Roaming', 'claude-desktop'));
    // Dev environment
    defaultLocations.push(path.join(os.homedir(), 'AppData', 'Roaming', 'claude-desktop-dev'));
    // Prod environment 
    defaultLocations.push(path.join(os.homedir(), 'AppData', 'Roaming', 'claude-desktop-prod'));
  } else if (platform === 'darwin') {
    // Main app location
    defaultLocations.push(path.join(os.homedir(), 'Library', 'Application Support', 'claude-desktop'));
    // Dev environment
    defaultLocations.push(path.join(os.homedir(), 'Library', 'Application Support', 'claude-desktop-dev'));
    // Prod environment 
    defaultLocations.push(path.join(os.homedir(), 'Library', 'Application Support', 'claude-desktop-prod'));
  } else if (platform === 'linux') {
    // Main app location
    defaultLocations.push(path.join(os.homedir(), '.config', 'claude-desktop'));
    // Dev environment
    defaultLocations.push(path.join(os.homedir(), '.config', 'claude-desktop-dev'));
    // Prod environment 
    defaultLocations.push(path.join(os.homedir(), '.config', 'claude-desktop-prod'));
  } else {
    console.log(`Unknown platform: ${platform}`);
    return [];
  }
  
  return defaultLocations;
}

// Delete API keys from keychain
async function cleanKeychainKeys() {
  const keytar = tryRequireKeytar();
  if (!keytar) {
    return;
  }
  
  console.log('\nCleaning keychain API keys...');
  
  // Known service and account combinations to check
  const keychainItems = [
    { service: 'claude-desktop', account: 'claude-api-key' },
    { service: 'claude-desktop', account: 'anthropic-api-key' },
    { service: 'claude-desktop-dev', account: 'claude-api-key' },
    { service: 'claude-desktop-dev', account: 'anthropic-api-key' },
    { service: 'claude-desktop-prod', account: 'claude-api-key' },
    { service: 'claude-desktop-prod', account: 'anthropic-api-key' }
  ];
  
  for (const item of keychainItems) {
    try {
      const result = await keytar.deletePassword(item.service, item.account);
      if (result) {
        console.log(`✓ Removed API key from keychain: ${item.service}/${item.account}`);
      } else {
        console.log(`- No API key found in keychain: ${item.service}/${item.account}`);
      }
    } catch (err) {
      console.log(`× Failed to access keychain for ${item.service}/${item.account}: ${err.message}`);
    }
  }
}

// Clean config files containing API keys
function cleanConfigFiles() {
  const appDataLocations = getAppDataLocations();
  console.log('\nCleaning config files...');
  
  appDataLocations.forEach(appDataDir => {
    if (!fs.existsSync(appDataDir)) {
      console.log(`Directory not found: ${appDataDir}`);
      return;
    }
    
    console.log(`\nChecking directory: ${appDataDir}`);
    
    // Look for config files
    const allFiles = fs.readdirSync(appDataDir);
    const configFiles = allFiles.filter(file => 
      file.endsWith('.json') || 
      file === 'config.json'
    );
    
    if (configFiles.length === 0) {
      console.log('No config files found');
      return;
    }
    
    // Create backup directory
    const backupDir = path.join(appDataDir, `apikey-backup-${new Date().toISOString().replace(/:/g, '-')}`);
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Process each config file
    configFiles.forEach(file => {
      const filePath = path.join(appDataDir, file);
      const backupPath = path.join(backupDir, file);
      
      try {
        // Create backup
        fs.copyFileSync(filePath, backupPath);
        
        // Read file content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Skip empty files
        if (!fileContent.trim()) {
          console.log(`- Skipping empty file: ${file}`);
          return;
        }
        
        try {
          // Try to parse as JSON
          const config = JSON.parse(fileContent);
          
          // Check for API key
          if (config.apiKey) {
            // Remove API key
            config.apiKey = "";
            
            // Write back config without API key
            fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
            console.log(`✓ Removed API key from: ${file}`);
          } else {
            console.log(`- No API key found in: ${file}`);
          }
        } catch (parseError) {
          // File may be encrypted, or not valid JSON
          console.log(`× Could not parse ${file} as JSON (may be encrypted)`);
        }
      } catch (error) {
        console.log(`× Error processing ${file}: ${error.message}`);
      }
    });
    
    console.log(`Backups saved to: ${backupDir}`);
  });
}

// Run the utility
async function main() {
  console.log('=======================================================');
  console.log('Claude Desktop API Key Cleaner');
  console.log('=======================================================');
  console.log('This utility will remove API keys from:');
  console.log('- System keychain entries');
  console.log('- Configuration files in all environments (dev/prod)');
  console.log('=======================================================\n');
  
  // Clean keychain items
  await cleanKeychainKeys();
  
  // Clean config files
  cleanConfigFiles();
  
  console.log('\n=======================================================');
  console.log('API key cleaning complete.');
  console.log('You will need to re-enter your API key when you start the application.');
  console.log('=======================================================');
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});