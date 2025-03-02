@echo off
echo ================================================
echo Starting Claude Desktop in DEVELOPMENT mode
echo ================================================
echo.

:: Go to project root directory
cd ..\..\

:: Build preload script
echo Building preload script...
call npm run build:preload

:: Start application in development mode
echo.
echo Launching Claude Desktop in development mode...
echo Developer tools and debug menus will be available.
echo.
call npm run dev

pause
