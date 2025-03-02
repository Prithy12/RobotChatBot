# Claude Desktop

A cross-platform desktop chatbot application powered by Anthropic's Claude API. Have conversations with Claude, with a modern and intuitive interface.

## Quick Download Links

Download the source code: [Download ZIP](https://github.com/Prithy12/RobotChatBot/archive/refs/heads/main.zip)

Or visit our online download page (after enabling GitHub Pages): [https://Prithy12.github.io/RobotChatBot/](https://Prithy12.github.io/RobotChatBot/)

### Running From Source

If you've downloaded the source code:

1. Go to either the `environments/prod` or `environments/dev` directory
2. Run `start.cmd` - this will automatically install dependencies and start the application
3. Each environment is completely self-contained and doesn't require files from the parent directory

### Setting Up Download Page

To enable the one-click download website:

1. Go to your GitHub repository settings > Pages
2. Under "Build and deployment" > "Source", select "Deploy from a branch"
3. Under "Branch", select "main" branch and "/docs" folder
4. Click "Save"
5. Wait a few minutes for your site to be published
6. Your download page will be available at: `https://Prithy12.github.io/RobotChatBot/`

Once set up, you can use this link in your profile or share it directly with users.

![Claude Desktop Screenshot](assets/screenshot.png)

## Features

- 🖥️ **Cross-platform**: Runs on Windows, macOS, and Linux
- 🔒 **Secure API key storage**: Keys stored securely using system keychain
- 💬 **Modern chat interface**: Clean, intuitive design with message bubbles
- 📝 **Message history**: Conversations are saved locally
- 🔄 **Auto-updates**: Application checks for and installs updates
- 📴 **Offline detection**: Notifies when connection is lost

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- npm (included with Node.js)
- An Anthropic API key (get one at [https://console.anthropic.com/](https://console.anthropic.com/))

### Download Pre-built Installers

Pre-built installers for Windows, macOS, and Linux can be found on the [Releases](https://github.com/Prithy12/RobotChatBot/releases) page.

### Building from Source

1. Clone the repository
   ```bash
   git clone https://github.com/prithy12/RobotChatBot.git
   cd RobotChatBot
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the application in development mode
   ```bash
   npm run dev
   ```

4. Build the application for your platform
   ```bash
   npm run build
   ```
   This will create installers in the `dist` directory.

## Development and Production Environments

This application now supports separate development and production environments:

### Development Environment
- Located in `environments/dev/`
- Includes developer tools and debugging features
- Use `environments/dev/start.cmd` to run
- Use `environments/dev/package.cmd` to create installer

### Production Environment
- Located in `environments/prod/`
- Clean interface without developer tools
- Use `environments/prod/start.cmd` to run
- Use `environments/prod/package.cmd` to create installer

### Root Shortcuts
- `start-dev.cmd` - Launches the development environment
- `start-prod.cmd` - Launches the production environment
- `package-dev.cmd` - Creates a development package
- `package-prod.cmd` - Creates a production package

## Building for Specific Platforms

### Windows

#### Using environment scripts (recommended)
```
# Development version
environments\dev\package.cmd

# Production version
environments\prod\package.cmd
```

#### Using npm scripts
```bash
# Development version
npm run package-dev

# Production version
npm run package-prod

# Manual platform-specific builds
npm run package-win    # Windows
npm run package-mac    # macOS
npm run package-linux  # Linux
npm run package-all    # All platforms
```

> **Note:** Windows symlink creation requires elevated permissions or Developer Mode. Our build configuration avoids symlinks, so you don't need to run as administrator or enable Developer Mode.

## Usage

1. Launch the application
2. Enter your Anthropic API key in the Settings dialog (one-time setup)
3. Start chatting with Claude!

### Keyboard Shortcuts

- `Enter`: Send message
- `Shift+Enter`: Add new line in message
- `Ctrl+C` or `Cmd+C`: Copy selected text
- `Ctrl+V` or `Cmd+V`: Paste text

### Application Menu

- **File**
  - Clear Chat History: Resets the current conversation
  - Export Chat History: Save conversation history as JSON
  - Quit: Close the application

- **Settings**
  - API Key: Configure your Anthropic API key

- **Help**
  - About: Information about the application
  - Check for Updates: Manually check for application updates

## Development

### Project Structure

```
claude-desktop/
├── assets/              # Application assets
│   └── icons/           # Application icons
├── scripts/             # Build scripts
├── src/                 # Source code
│   ├── components/      # UI components
│   ├── services/        # Service modules
│   ├── utils/           # Utility functions
│   ├── index.html       # Main HTML file
│   ├── main.js          # Main process
│   ├── preload.js       # Preload script
│   ├── renderer.js      # Renderer process
│   └── styles.css       # Application styles
├── package.json         # Project manifest
└── README.md            # Project documentation
```

### Technology Stack

- [Electron](https://www.electronjs.org/): Cross-platform desktop app framework
- [Electron Builder](https://www.electron.build/): Packaging and distribution
- [Electron Store](https://github.com/sindresorhus/electron-store): Data persistence
- [Keytar](https://github.com/atom/node-keytar): Secure API key storage
- [Anthropic API](https://docs.anthropic.com/claude/): Claude AI capabilities

## Security

- API keys are stored securely using your system's keychain or credential manager
- Message history is stored locally, encrypted at rest
- All configuration files are secured with a per-installation encryption key 
- No data is sent to any servers except directly to Anthropic's API

### Encryption Key Management

Claude Desktop uses a secure, randomly generated encryption key to protect your configuration data:

- A unique encryption key is generated on first startup for each installation
- The key is stored in your application data directory as `.encryption-key`
- This approach ensures each installation has its own unique encryption rather than using a hardcoded key
- You can reset your encryption key using the reset-config.js utility (see "Resetting Configuration" below)

### Resetting Configuration

If you need to reset your configuration to get a fresh start:

1. Close the application
2. Run the reset utility:
   ```bash
   node reset-config.js
   ```
3. Follow the prompts to select what you want to reset
4. Restart the application

The reset utility provides options to:
- Reset all configuration (fresh installation)
- Reset only your API key
- Reset just the encryption key
- Select specific configuration files to reset

### API Key Management

If you need to remove your API keys from all environments:

1. Close the application
2. Run the API key cleaner utility:
   ```bash
   # On Windows:
   clean-api-keys.cmd
   
   # On macOS/Linux:
   node clean-api-keys.js
   ```
   
This utility will:
- Remove API keys from the system keychain for all environments (dev/prod)
- Clear API keys from all config files in all environments
- Create backups of any modified files
- Report which keys were removed

After running, you'll need to re-enter your API key when you start the application again.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Anthropic](https://www.anthropic.com/) for creating Claude AI
- [Electron](https://www.electronjs.org/) team for the fantastic framework