/**
 * Packaging script for the Development environment
 * 
 * This script builds and packages the Claude Desktop application for development use.
 * It includes developer tools, debugging capabilities, and verbose logging.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Paths
const projectRoot = path.resolve(__dirname, '../..');
const distFolder = path.join(projectRoot, 'dist');
const devDistFolder = path.join(distFolder, 'dev');

// Get platform-specific command
function getPlatformCommand() {
  const platform = os.platform();
  
  switch (platform) {
    case 'win32':
      return `electron-builder --win --config.productName="Claude Desktop Dev" --config.appId="com.claudedesktop.dev" --config.directories.output="${devDistFolder}" --config.forceCodeSigning=false --config.extraMetadata.main=src/main.js --config.extraMetadata.name="claude-desktop-dev" --config.win.artifactName="Claude-Desktop-Dev-Setup-\${version}.\${ext}"`;
    case 'darwin':
      return `electron-builder --mac --config.productName="Claude Desktop Dev" --config.appId="com.claudedesktop.dev" --config.directories.output="${devDistFolder}" --config.extraMetadata.main=src/main.js --config.extraMetadata.name="claude-desktop-dev" --config.mac.artifactName="Claude-Desktop-Dev-\${version}.\${ext}"`;
    case 'linux':
      return `electron-builder --linux --config.productName="Claude Desktop Dev" --config.appId="com.claudedesktop.dev" --config.directories.output="${devDistFolder}" --config.extraMetadata.main=src/main.js --config.extraMetadata.name="claude-desktop-dev" --config.linux.artifactName="claude-desktop-dev-\${version}.\${ext}"`;
    default:
      console.error('Unsupported platform:', platform);
      process.exit(1);
  }
}

// Main build function
async function buildDev() {
  try {
    console.log('🔨 Starting Development build process...');
    
    // Ensure dist directory exists
    if (!fs.existsSync(devDistFolder)) {
      console.log(`Creating directory: ${devDistFolder}`);
      fs.mkdirSync(devDistFolder, { recursive: true });
    }
    
    // Build preload script
    console.log('Building preload script...');
    execSync('npm run build:preload', { stdio: 'inherit', cwd: projectRoot });
    
    // Set environment variable for development build
    process.env.DEV_BUILD = 'true';
    
    // Run the packaging command
    console.log('Packaging development build...');
    console.log(`Using command: ${getPlatformCommand()}`);
    execSync(getPlatformCommand(), { 
      stdio: 'inherit',
      cwd: projectRoot,
      env: { ...process.env, DEV_BUILD: 'true' }
    });
    
    console.log('✅ Development build completed successfully!');
    console.log(`Installer can be found in: ${devDistFolder}`);
    
  } catch (error) {
    console.error('❌ Development build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildDev();