@echo off
echo ================================================
echo Starting Claude Desktop in PRODUCTION mode
echo ================================================
echo.

:: Create a directory for logs if it doesn't exist
if not exist logs mkdir logs

:: Check for missing dependencies and install if needed
echo Checking dependencies...
call npm list electron electron-store keytar electron-updater > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing missing dependencies...
    call npm install electron electron-store keytar electron-updater
) else (
    echo Dependencies already installed.
)

:: Build preload script in current directory
echo Building preload script...
node package-prod.js

:: Start application in production mode
echo.
echo Launching Claude Desktop...
echo.
npx electron src/main.js > logs\app-output.log 2>&1

pause