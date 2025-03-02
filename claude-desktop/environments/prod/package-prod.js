/**
 * Packaging script for the Production environment
 * 
 * This script builds and packages the Claude Desktop application for production use.
 * It includes only the necessary files for a clean, optimized user experience.
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
      return `electron-builder --win --config.productName="Claude Desktop" --config.appId="com.claudedesktop.app" --config.directories.output="${prodDistFolder}" --config.forceCodeSigning=false --config.extraMetadata.main=environments/prod/src/main.js --config.extraMetadata.name="claude-desktop" --config.win.artifactName="Claude-Desktop-Setup-\${version}.\${ext}" --config.files=["environments/prod/**/*", "assets/**/*", "node_modules/**/*", "package.json", "!environments/dev/**/*"]`;
    case 'darwin':
      return `electron-builder --mac --config.productName="Claude Desktop" --config.appId="com.claudedesktop.app" --config.directories.output="${prodDistFolder}" --config.extraMetadata.main=environments/prod/src/main.js --config.extraMetadata.name="claude-desktop" --config.mac.artifactName="Claude-Desktop-\${version}.\${ext}" --config.files=["environments/prod/**/*", "assets/**/*", "node_modules/**/*", "package.json", "!environments/dev/**/*"]`;
    case 'linux':
      return `electron-builder --linux --config.productName="Claude Desktop" --config.appId="com.claudedesktop.app" --config.directories.output="${prodDistFolder}" --config.extraMetadata.main=environments/prod/src/main.js --config.extraMetadata.name="claude-desktop" --config.linux.artifactName="claude-desktop-\${version}.\${ext}" --config.files=["environments/prod/**/*", "assets/**/*", "node_modules/**/*", "package.json", "!environments/dev/**/*"]`;
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
    
    // Build preload script
    console.log('Building preload script...');
    execSync('npm run build:preload', { stdio: 'inherit', cwd: projectRoot });
    
    // Set environment variable for production build
    process.env.PROD_BUILD = 'true';
    
    // Run the packaging command
    console.log('Packaging production build...');
    console.log(`Using command: ${getPlatformCommand()}`);
    execSync(getPlatformCommand(), { 
      stdio: 'inherit',
      cwd: projectRoot,
      env: { ...process.env, PROD_BUILD: 'true' }
    });
    
    console.log('✅ Production build completed successfully!');
    console.log(`Installer can be found in: ${prodDistFolder}`);
    
    // Generate download.html
    generateDownloadPage(prodDistFolder);
    
  } catch (error) {
    console.error('❌ Production build failed:', error.message);
    process.exit(1);
  }
}

// Generate a download page
function generateDownloadPage(prodDistFolder) {
  console.log('Generating download page...');
  
  // Read the version from package.json
  const packageJson = require(path.join(projectRoot, 'package.json'));
  const version = packageJson.version;
  
  // Get file names based on platform
  const platform = os.platform();
  let windowsFileName = `Claude-Desktop-Setup-${version}.exe`;
  let macFileName = `Claude-Desktop-${version}.dmg`;
  let linuxFileName = `claude-desktop-${version}.AppImage`;
  
  // Update version.json for the website to know the latest version
  const versionData = {
    version: version,
    files: {
      windows: windowsFileName,
      mac: macFileName,
      linux: linuxFileName
    },
    releaseDate: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(projectRoot, 'version.json'), JSON.stringify(versionData, null, 2));
  console.log('Updated version.json with latest release information');
  
  // Copy the download.html to the root directory (it will be served from the website)
  if (fs.existsSync(path.join(projectRoot, 'download.html'))) {
    console.log('Download page already exists, updating with latest version info');
    
    // Read the existing download.html
    let downloadHtml = fs.readFileSync(path.join(projectRoot, 'download.html'), 'utf8');
    
    // Update version numbers
    downloadHtml = downloadHtml.replace(/data-version="[^"]*"/g, `data-version="${version}"`);
    
    // Write the updated file
    fs.writeFileSync(path.join(projectRoot, 'download.html'), downloadHtml);
  } else {
    console.log('Creating new download page');
    
    // Create a simple download page
    const downloadHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download Claude Desktop</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }
        h1 {
            text-align: center;
            margin-bottom: 2rem;
        }
        .download-section {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .download-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
            margin-top: 2rem;
        }
        .download-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .download-button:hover {
            background-color: #0069d9;
        }
        .download-button img {
            margin-right: 0.5rem;
            width: 24px;
            height: 24px;
        }
        .version-info {
            text-align: center;
            font-size: 0.9rem;
            color: #6c757d;
            margin-top: 1rem;
        }
        .system-requirements {
            margin-top: 3rem;
        }
    </style>
</head>
<body>
    <h1>Download Claude Desktop</h1>
    
    <div class="download-section">
        <h2>Choose your platform</h2>
        <p>Claude Desktop is available for Windows, macOS, and Linux. Select your operating system below to download the latest version.</p>
        
        <div class="download-buttons">
            <a href="https://github.com/Prithy12/RobotChatBot/releases/download/v${version}/${windowsFileName}" class="download-button" id="windows-download" data-version="${version}">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Windows_logo_-_2012.svg" alt="Windows logo">
                Windows
            </a>
            <a href="https://github.com/Prithy12/RobotChatBot/releases/download/v${version}/${macFileName}" class="download-button" id="mac-download" data-version="${version}">
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple logo">
                macOS
            </a>
            <a href="https://github.com/Prithy12/RobotChatBot/releases/download/v${version}/${linuxFileName}" class="download-button" id="linux-download" data-version="${version}">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" alt="Linux logo">
                Linux
            </a>
        </div>
        
        <p class="version-info">Current version: ${version} (Released: ${new Date().toLocaleDateString()})</p>
    </div>
    
    <div class="system-requirements">
        <h2>System Requirements</h2>
        <ul>
            <li><strong>Windows:</strong> Windows 10 or later</li>
            <li><strong>macOS:</strong> macOS 10.13 (High Sierra) or later</li>
            <li><strong>Linux:</strong> Ubuntu 18.04 or equivalent</li>
            <li><strong>RAM:</strong> 4 GB minimum</li>
            <li><strong>Disk space:</strong> 500 MB available space</li>
            <li><strong>Internet connection:</strong> Required for API access</li>
        </ul>
    </div>
    
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
</body>
</html>
`;
    
    fs.writeFileSync(path.join(projectRoot, 'download.html'), downloadHtml);
  }
  
  console.log('Download page created/updated successfully');
}

// Run the build
buildProd();