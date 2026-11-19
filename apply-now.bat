@echo off
rem Re-apply the skin to a RUNNING WorkBuddy (no restart needed).
rem Requires the debug port, which start-skinned.bat opens at launch.
setlocal
set "DIR=%~dp0"
set "PORT=9342"

set "NODE="
where node >nul 2>&1 && set "NODE=node"
if not defined NODE for /d %%D in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"

if not defined NODE (
  echo [x] Node.js not found.
  pause & exit /b 1
)

"%NODE%" "%DIR%inject.mjs" --port %PORT% --once
if errorlevel 1 (
  echo.
  echo [!] WorkBuddy is not running with the debug port.
  echo     Start it with start-skinned.bat, then run this again.
) else (
  echo.
  echo [ok] skin applied.
)
ping -n 4 127.0.0.1 >nul
