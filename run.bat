@echo off
set ROOT_DIR=%~dp0

:: Run the multi-service runner inside this terminal window (no external popups)
node "%ROOT_DIR%run.js"
