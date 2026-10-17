@echo off
title Cab Booking Platform - Launch Server
echo ===================================================
echo     Cab Booking Platform - Python + Next.js Stack
echo ===================================================
echo.
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "FastAPI Backend" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "Next.js Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   System launched successfully!
echo   - Frontend: http://localhost:3000
echo   - Live Demo: http://localhost:3000/demo
echo   - Backend API Docs: http://127.0.0.1:8000/docs
echo ===================================================
pause
