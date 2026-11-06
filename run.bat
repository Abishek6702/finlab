@echo off
set ROOT_DIR=%~dp0

echo ====================================================
echo Starting all 3 FinLab services:
echo   1. Server  (API / Nodemon)
echo   2. Landing (Next.js on Port 9001)
echo   3. Client  (Vite React)
echo ====================================================

start "FinLab - Server" cmd /k "cd /d %ROOT_DIR%server && npm run dev"
start "FinLab - Landing (Port 9000)" cmd /k "cd /d %ROOT_DIR%landing && npm run dev"
start "FinLab - Client" cmd /k "cd /d %ROOT_DIR%client && npm run dev"

echo All 3 services have been launched!

