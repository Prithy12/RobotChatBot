@echo off
echo Clearing Electron cache and restarting Claude Desktop...

:: Clear Electron cache directories
if exist "%APPDATA%\Electron\Cache" (
  echo Clearing Electron cache...
  rmdir /s /q "%APPDATA%\Electron\Cache"
)

if exist "%APPDATA%\Electron\Network Persistent State" (
  echo Clearing Network Persistent State...
  del /f "%APPDATA%\Electron\Network Persistent State"
)

:: Clear app-specific cache directories
if exist "%APPDATA%\claude-desktop" (
  echo Clearing Claude Desktop cache...
  rmdir /s /q "%APPDATA%\claude-desktop\Cache"
  rmdir /s /q "%APPDATA%\claude-desktop\Code Cache"
  rmdir /s /q "%APPDATA%\claude-desktop\GPUCache"
)

echo Restarting application...

:: Run the application
call start.cmd

echo Done\!
