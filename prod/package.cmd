@echo off
echo Building Claude Desktop Production Version...
echo.

cd ..\..\
node environments\prod\package-prod.js

echo.
if %ERRORLEVEL% EQU 0 (
  echo Production package created successfully!
  echo Find your installer in the dist\prod directory
) else (
  echo Failed to create production package. See errors above.
)

pause