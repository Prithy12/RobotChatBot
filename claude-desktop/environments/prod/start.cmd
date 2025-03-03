@echo off
echo ================================================
echo Starting Claude Desktop in PRODUCTION mode
echo ================================================
echo.

:: Go to project root directory
cd ..\..\

:: Build preload script
echo Building preload script...
call npm run build:preload

:: Start application in production mode
echo.
echo Launching Claude Desktop...
echo.
call npm run start

pause
