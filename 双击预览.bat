@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SelfLog - local preview

where node >nul 2>nul
if errorlevel 1 goto nonode

node preview.js %*
echo.
echo   Server stopped. You can close this window.
echo.
pause
goto end

:nonode
echo.
echo   [!] Node.js was not found on this computer.
echo.
echo   Option 1: install Node.js from https://nodejs.org/ then double-click this file again.
echo   Option 2: if you have Python, run this in this folder:
echo                python -m http.server 8000
echo            then open http://127.0.0.1:8000/
echo.
pause
goto end

:end