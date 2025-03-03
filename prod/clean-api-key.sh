#!/bin/bash
# Remove the API key from system keychain and local storage
echo "Removing API key from Claude Desktop..."
npx electron clean-api-key.js
echo "API key removal process completed."
read -p "Press Enter to continue..."