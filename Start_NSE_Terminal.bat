@echo off
title NIFTY 50 LIVE TERMINAL
color 0A
cd /d "%~dp0"

echo =======================================================
echo          STARTING VOXKAGE NSE LIVE TERMINAL
echo =======================================================
echo.

:: Check if virtual environment exists
if not exist venv (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Python not found. Please install Python 3.10+ and add to PATH.
        pause
        exit /b
    )
    echo [SETUP] Installing dependencies...
    call venv\Scripts\activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    echo [SETUP] Installing browser binaries...
    playwright install chromium
    echo [SETUP] Setup complete.
) else (
    call venv\Scripts\activate
)

echo [RUNNING] Connecting to NSE India...
echo The browser will open briefly to bypass security checks.
echo.
echo Do not close this window while the terminal is active.
echo.

python live_nse_terminal.py

if errorlevel 1 (
    echo.
    echo [ERROR] Terminal crashed. Checking for common issues...
    echo 1. Ensure Excel is installed.
    echo 2. Check your internet connection.
    pause
)

echo.
echo Terminal stopped. Press any key to exit.
pause >nul
