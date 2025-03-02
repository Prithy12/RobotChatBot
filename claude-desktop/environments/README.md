# Claude Desktop Environments

This directory contains separate environments for development and production use of the Claude Desktop application.

## Environment Types

### Development Environment (`dev/`)
- Includes developer tools and debugging features
- Suitable for development, testing, and troubleshooting
- Shows debug menus and additional logging
- Separate app ID and installation to avoid conflicts with production

### Production Environment (`prod/`)
- Clean interface without developer tools
- Suitable for end-users and demonstrations
- Hides all development features
- Optimized for end-user experience
- Standard app ID and installation path

## Available Scripts

### Development Environment
- `start.cmd` - Starts the application in development mode
- `reset.cmd` - Resets the development configuration
- `package.cmd` - Creates a distributable package for development use

### Production Environment
- `start.cmd` - Starts the application in production mode
- `reset.cmd` - Resets the production configuration
- `package.cmd` - Creates a distributable package for production use

## Packaging Information

The packaging scripts create installers for the current platform in their respective distribution folders:
- Development builds: `dist/dev/`
- Production builds: `dist/prod/`

Each environment uses different app IDs to allow side-by-side installation on the same machine.

### Root Shortcuts
For convenience, the following shortcuts are available in the root directory:
- `package-dev.cmd` - Creates a development package
- `package-prod.cmd` - Creates a production package

## Platform Support
The packaging scripts support:
- Windows (NSIS installer)
- macOS (DMG installer)
- Linux (AppImage and DEB packages)

Each environment has its own README with more specific information.
