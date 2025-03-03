@echo off
echo ================================================
echo Claude Desktop - Reset Configuration Utility
echo ================================================
echo.
echo This utility will reset your configuration for a fresh start.
echo Perfect for demonstrating a clean installation to users.
echo.

:: Go to project root directory
cd ..\..\

:: Run the reset utility
node reset-config.js

pause
