@echo off
echo Building Claude Desktop Development Version...
echo.

cd ..\..\
node environments\dev\package-dev.js

echo.
if %ERRORLEVEL% EQU 0 (
  echo Development package created successfully!
  echo Find your installer in the dist\dev directory
) else (
  echo Failed to create development package. See errors above.
)

pause