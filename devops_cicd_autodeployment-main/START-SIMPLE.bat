@echo off
echo ========================================
echo  CI/CD Auto Deployment Platform
echo ========================================
echo.
echo Starting services...
echo.

REM Start backend on 5000
echo Starting Backend (port 5000)...
start "DeployHub Backend" cmd /k node server-simple.js

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start frontend on 3000
echo Starting Frontend (port 3000)...
start "DeployHub Frontend" cmd /k npx http-server public -p 3000

echo.
echo ========================================
echo Services started!
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Login with:
echo   Username: admin
echo   Password: 1234
echo ========================================
