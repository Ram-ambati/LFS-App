@echo off
:: Safe startup script for LFS App
:: Launches Backend and Frontend in separate windows

echo Checking project directories...

:: Check backend directory
if not exist "backend" (
    echo [ERROR] Backend directory not found.
    pause
    exit /b 1
)

:: Check frontend directory
if not exist "frontend" (
    echo [ERROR] Frontend directory not found.
    pause
    exit /b 1
)

echo Starting Backend Service...
start "Backend Service" cmd /k "cd backend && .\mvnw spring-boot:run"

echo Starting Frontend Service...
:: Using 'call' for npm install ensures it completes before starting vite
start "Frontend Service" cmd /k "cd frontend && npm install && npm run dev"

echo Startup commands initiated. Check individual terminal windows for logs.
echo Press any key to close this launcher window.
pause
