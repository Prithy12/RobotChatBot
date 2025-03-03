# Claude Desktop - Production Environment

This environment is configured for end users and demonstrations.

## Features in Production Mode

- No DevTools
- No debug menu
- Clean, distraction-free interface
- All the same core functionality
- Optimized for end-user experience

## Starting the Application

1. Double-click `start.cmd` in this folder
2. The application will start in production mode

## Reset for Fresh Demo

If you want to demonstrate a fresh installation:

1. Close the application
2. Run `reset.cmd` in this folder
3. Start the application again

## Packaging the Application

To create a distributable package for production use:

1. Double-click `package.cmd` in this folder
2. The script will build and package the application
3. The installer will be available in the `dist/prod` directory

The production package:
- Uses the standard app ID (`com.claudedesktop.app`)
- Uses the standard product name (`Claude Desktop`)
- Has DevTools disabled
- Is optimized for performance and security

## First-time Setup

When starting fresh, you'll need to:
1. Enter your Anthropic API key
2. The application will generate a unique encryption key for this installation
3. All settings will be at their defaults

## Available Scripts

- `npm run start` - Start in production mode
- `npm run package-prod` - Create a production package
