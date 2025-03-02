# Claude Desktop - Development Environment

This environment is configured for development and debugging.

## Features in Dev Mode

- DevTools are automatically opened
- Debug menu is available
- Full logging is enabled
- All diagnostic features are accessible

## Starting the Application

1. Double-click `start.cmd` in this folder
2. The application will start in development mode

## Reset Configuration

If you need to reset the configuration to test a fresh installation:

1. Close the application
2. Run `reset.cmd` in this folder
3. Start the application again

## Packaging the Application

To create a distributable package for development use:

1. Double-click `package.cmd` in this folder
2. The script will build and package the application
3. The installer will be available in the `dist/dev` directory

The development package:
- Has a different app ID (`com.claudedesktop.dev`)
- Uses a different product name (`Claude Desktop Dev`)
- Can be installed alongside the production version
- Includes all development features

## Available Scripts

- `npm run dev` - Start in development mode
- `npm run build:preload` - Build the preload script only
- `npm run package-dev` - Create a development package
- `npm run rebuild` - Rebuild native modules
