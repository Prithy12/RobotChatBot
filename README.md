# Claude Desktop Robot - Production Environment

This environment is configured for end users and demonstrations, featuring a robot UI that interacts with Claude AI.

## Features in Production Mode

- Interactive robot character with facial expressions and animations
- Audio feedback and speech synthesis
- Clean, distraction-free interface
- Optimized for end-user experience
- Cross-platform support (Windows and macOS)

## Setup Instructions

Before running the application, you need to install the required dependencies:

```bash
# Run this in the environments/prod directory
npm install
```

This will install all dependencies required for the application to run.

## Starting the Application

### Windows
1. Double-click `start.cmd` in this folder
2. The application will start in production mode

### macOS
1. Open Terminal
2. Navigate to the application directory
3. Run `./start.sh`
   ```bash
   cd /path/to/claude-desktop/environments/prod
   ./start.sh
   ```

## Reset for Fresh Demo

If you want to demonstrate a fresh installation:

### Windows
1. Close the application
2. Run `reset.cmd` in this folder
3. Start the application again

### macOS
1. Close the application
2. Open Terminal and navigate to the application directory
3. Run `./reset.sh`
   ```bash
   cd /path/to/claude-desktop/environments/prod
   ./reset.sh
   ```

## Removing Your API Key

If you need to remove your Anthropic API key from the application:

### Windows
1. Close the application
2. Run `clean-api-key.cmd` in this folder

### macOS
1. Close the application
2. Open Terminal and navigate to the application directory
3. Run `./clean-api-key.sh`
   ```bash
   cd /path/to/claude-desktop/environments/prod
   ./clean-api-key.sh
   ```

## Packaging the Application

To create a distributable package for production use:

### Windows
1. Double-click `package.cmd` in this folder
2. The script will build and package the application

### macOS
1. Open Terminal and navigate to the application directory
2. Run `./package.sh`
   ```bash
   cd /path/to/claude-desktop/environments/prod
   ./package.sh
   ```

The installer will be available in the `dist/prod` directory once packaging is complete.

The production package:
- Uses the standard app ID (`com.claudedesktop.app`)
- Uses the standard product name (`Claude Desktop`)
- Is optimized for performance and security

## First-time Setup

When starting fresh, you'll need to:
1. Enter your Anthropic API key
2. The application will generate a unique encryption key for this installation
3. All settings will be at their defaults

## Available NPM Scripts

- `npm run start` - Start in production mode
- `npm run build:preload` - Build the preload script
- `npm run package-prod` - Create a production package

## Troubleshooting

### Missing Dependencies

If you encounter errors about missing modules, make sure you've installed all dependencies:

```bash
npm install electron electron-updater electron-store keytar
```

### Node.js Not Found

If you see errors about 'node' not being recognized, make sure Node.js is installed and in your PATH.

### macOS Permissions

On macOS, you may need to grant permission for the application to:
- Access the microphone (for speech input)
- Access the keychain (for API key storage)

### File Path Issues

The application expects certain files to be in specific locations. If you see errors about missing files, check that all required files are in the correct locations.

### Script Permission Errors on macOS

If you get permission errors when trying to run the `.sh` scripts on macOS, make them executable:

```bash
chmod +x *.sh
```