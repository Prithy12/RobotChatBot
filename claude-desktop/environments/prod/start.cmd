@echo off
echo ================================================
echo Starting Claude Desktop in PRODUCTION mode
echo ================================================
echo.

:: Check if node_modules exists
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo Failed to install dependencies.
    pause
    exit /b %ERRORLEVEL%
  )
)

:: Build the application if not already built
if not exist dist\preload.bundle.js (
  echo Building application...
  call npm run build
  if %ERRORLEVEL% neq 0 (
    echo Failed to build application.
    pause
    exit /b %ERRORLEVEL%
  )
)

:: Start the application
echo.
echo Launching Claude Desktop...
echo.
call electron . --prod

pause