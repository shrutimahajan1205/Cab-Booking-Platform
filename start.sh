#!/usr/bin/env bash
echo "==================================================="
echo "    Cab Booking Platform - Python + Next.js Stack"
echo "==================================================="
echo ""
echo "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..."
(cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
BACKEND_PID=$!

echo "[2/2] Starting Next.js Frontend on http://localhost:3000 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "==================================================="
echo "  System launched successfully!"
echo "  - Frontend: http://localhost:3000"
echo "  - Live Demo: http://localhost:3000/demo"
echo "  - Backend API Docs: http://127.0.0.1:8000/docs"
echo "==================================================="

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
