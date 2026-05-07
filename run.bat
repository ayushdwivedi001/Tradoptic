@echo off
echo Starting NSE Terminal API Backend (FastAPI)...
start cmd /k "cd backend && ..\venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo Starting NSE Terminal Frontend (Vite+React)...
start cmd /k "cd frontend && npm run dev"

echo Both servers are starting!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo Please open your browser to the Frontend URL.
