/**
 * Packaging script for the Production environment
 * 
 * This script builds and packages the Claude Desktop application for production use.
 * It disables developer tools, minimizes logging, and optimizes for end-user experience.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Paths
const projectRoot = path.resolve(__dirname, '../..');
const distFolder = path.join(projectRoot, 'dist');
const prodDistFolder = path.join(distFolder, 'prod');

// Get platform-specific command
function getPlatformCommand() {
  const platform = os.platform();
  
  switch (platform) {
    case 'win32':
      return `electron-builder --win --config.productName="Claude Desktop" --config.appId="com.claudedesktop.app" --config.directories.output="${prodDistFolder}" --config.forceCodeSigning=false --config.extraMetadata.main=src/main.js --config.win.artifactName="Claude-Desktop-Setup-\${version}.\${ext}"`;
    case 'darwin':
      return `electron-builder --mac --config.productName="Claude Desktop" --config.appId="com.claudedesktop.app" --config.directories.output="${prodDistFolder}" --config.extraMetadata.main=src/main.js --config.mac.artifactName="Claude-Desktop-\${version}.\${ext}"`;
    case 'linux':
      return `electron-builder --linux --config.productName="Claude Desktop" --config.appId="com.claudedesktop.app" --config.directories.output="${prodDistFolder}" --config.extraMetadata.main=src/main.js --config.linux.artifactName="claude-desktop-\${version}.\${ext}"`;
    default:
      console.error('Unsupported platform:', platform);
      process.exit(1);
  }
}

// Main build function
async function buildProd() {
  try {
    console.log('🔨 Starting Production build process...');
    
    // Ensure dist directory exists
    if (!fs.existsSync(prodDistFolder)) {
      console.log(`Creating directory: ${prodDistFolder}`);
      fs.mkdirSync(prodDistFolder, { recursive: true });
    }
    
    // Build preload script with production optimizations
    console.log('Building optimized preload script...');
    
    // Set NODE_ENV to production for webpack optimizations
    process.env.NODE_ENV = 'production';
    execSync('npm run build:preload', { 
      stdio: 'inherit', 
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // Run the packaging command
    console.log('Packaging production build...');
    console.log(`Using command: ${getPlatformCommand()}`);
    execSync(getPlatformCommand(), { 
      stdio: 'inherit',
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    console.log('✅ Production build completed successfully!');
    console.log(`Installer can be found in: ${prodDistFolder}`);
    
  } catch (error) {
    console.error('❌ Production build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildProd();