@echo off
rem Restore the official look: the injected CSS lives only in memory,
rem so a normal restart is enough.
setlocal
if not defined WORKBUDDY_EXE (
  for %%P in (
    "D:\WorkBuddy\WorkBuddy.exe"
    "%LOCALAPPDATA%\Programs\WorkBuddy\WorkBuddy.exe"
    "%ProgramFiles%\WorkBuddy\WorkBuddy.exe"
  ) do if not defined WORKBUDDY_EXE if exist %%P set "WORKBUDDY_EXE=%%~P"
)

taskkill /IM WorkBuddy.exe /F >nul 2>&1
ping -n 4 127.0.0.1 >nul

if defined WORKBUDDY_EXE (
  start "" "%WORKBUDDY_EXE%"
) else (
  echo Close WorkBuddy and open it normally to restore the official UI.
)
