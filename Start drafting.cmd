@echo off
rem Double-click me.
rem
rem This runs in cmd.exe, not PowerShell, so PowerShell's execution policy
rem - the thing that blocks npx - does not apply here at all.
title Draft with Slater
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed, and the relay needs it.
  echo   Get it from https://nodejs.org - the LTS button - then run this again.
  echo.
  pause
  exit /b 1
)

node server\launch.js %*
echo.
echo   The draft has ended. You can close this window.
pause
