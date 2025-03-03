#!/bin/bash
# Reset the Electron cache and restart the application
echo "Clearing Electron cache and restarting Claude Desktop..."

# Find and remove Electron cache directories
rm -rf ~/Library/Application\ Support/claude-desktop/Cache
rm -rf ~/Library/Application\ Support/claude-desktop/Code\ Cache
rm -rf ~/Library/Application\ Support/claude-desktop/GPUCache

echo "Cache cleared. Restarting application..."
npx electron .