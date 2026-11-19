@echo off
rem ---------------------------------------------------------------------------
rem  Yunlan Skin Launcher for WorkBuddy
rem  1) debug port already open -> inject only
rem  2) WorkBuddy is running    -> restart it with the debug port
rem  3) not running             -> start it with the debug port
rem  Optional: set WORKBUDDY_EXE to your install path before running.
rem ---------------------------------------------------------------------------
setlocal
set "DIR=%~dp0"
set "PORT=9342"
set "WORKBUDDY_REMOTE_DEBUGGING_PORT=%PORT%"

if not defined WORKBUDDY_EXE (
  for %%P in (
    "D:\WorkBuddy\WorkBuddy.exe"
    "%LOCALAPPDATA%\Programs\WorkBuddy\WorkBuddy.exe"
    "%ProgramFiles%\WorkBuddy\WorkBuddy.exe"
    "%ProgramFiles(x86)%\WorkBuddy\WorkBuddy.exe"
  ) do if not defined WORKBUDDY_EXE if exist %%P set "WORKBUDDY_EXE=%%~P"
)

set "NODE="
where node >nul 2>&1 && set "NODE=node"
if not defined NODE for /d %%D in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"

if not defined NODE (
  echo [x] Node.js not found. Install Node 18+ and retry.
  pause & exit /b 1
)
if not defined WORKBUDDY_EXE (
  echo [x] WorkBuddy.exe not found.
  echo     Run:  set WORKBUDDY_EXE=D:\your\path\WorkBuddy.exe
  pause & exit /b 1
)

curl -s -m 2 http://127.0.0.1:%PORT%/json/version >nul 2>&1
if not errorlevel 1 goto inject

tasklist /FI "IMAGENAME eq WorkBuddy.exe" 2>nul | find /I "WorkBuddy.exe" >nul
if not errorlevel 1 (
  echo [1/2] Restarting WorkBuddy with the debug port...
  taskkill /IM WorkBuddy.exe /F >nul 2>&1
  ping -n 4 127.0.0.1 >nul
) else (
  echo [1/2] Starting WorkBuddy with the debug port...
)

start "" "%WORKBUDDY_EXE%"
ping -n 16 127.0.0.1 >nul

:inject
echo [2/2] Injecting skin...
"%NODE%" "%DIR%inject.mjs" --port %PORT% --ttl 0
