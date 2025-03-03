#!/bin/bash
# Package the application for macOS
echo "Packaging Claude Desktop Robot for macOS..."
node package-prod.js
echo "Packaging completed."
read -p "Press Enter to continue..."