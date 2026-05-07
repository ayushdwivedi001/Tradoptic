---
name: python-one-click-setup
description: Workflow for creating robust, one-click Windows batch files to automate Python virtual environment setup, dependency installation, and application launch. Use when distributing tools to non-technical users or simplifying project initialization.
---

# Python One-Click Setup (Windows)

This skill provides a standard procedure for creating "out-of-the-box" executable environments for Python projects using Windows batch files.

## Workflow

### 1. Create Start_App.bat
Create a batch file in the project root to orchestrate the environment.

```batch
@echo off
SETLOCAL EnableDelayedExpansion

:: 1. Define Paths
SET "VENV_DIR=%~dp0venv"
SET "REQ_FILE=%~dp0requirements.txt"
SET "MAIN_SCRIPT=%~dp0main.py"

:: 2. Check for Virtual Environment
if not exist "!VENV_DIR!" (
    echo Creating virtual environment...
    python -m venv "!VENV_DIR!"
)

:: 3. Activate and Install Dependencies
call "!VENV_DIR!\Scripts\activate.bat"
echo Checking dependencies...
pip install -r "!REQ_FILE!" --quiet

:: 4. Tool-Specific Post-Install (e.g., Playwright)
:: playwright install chromium

:: 5. Launch Application
echo Launching Application...
python "!MAIN_SCRIPT!"
pause
```

### 2. Configuration Best Practices
- **requirements.txt**: Use pinned versions where possible to prevent breaking changes on the user's machine.
- **.gitignore**: Ensure `venv/`, `__pycache__/`, and temporary logs/cookies are excluded.
- **Path Handling**: Use `%~dp0` (directory of the batch file) to ensure paths work regardless of where the user launches from.

### 3. Verification Checklist
- [ ] Batch file successfully creates `venv` if missing.
- [ ] Dependencies install correctly on first run.
- [ ] Application launches automatically after setup.
- [ ] `pause` at the end of the batch file keeps the window open so users can read errors if the script crashes.

## Pitfalls & Landmines
- **Python Path**: If `python` is not in the system PATH, the batch file will fail. Advise the user to check "Add Python to PATH" during installation.
- **Excel/COM Interactions**: If using `xlwings` or similar, ensure the script handles cases where Excel is already open or minimized.
- **Admin Rights**: Some installations might require elevation; recommend running the terminal as Administrator if `pip install` fails.
