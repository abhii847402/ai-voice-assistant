@echo off
title RAJ AI - Windows Desktop Control Companion Bridge v2.0
color 0B
echo =====================================================================
echo       RAJ AI - WINDOWS DESKTOP CONTROL COMPANION SERVICE v2.0
echo =====================================================================
echo.
echo Checking for Python 3...

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in your PATH!
    echo Please install Python 3.8+ from https://www.python.org/
    echo IMPORTANT: Check "Add python.exe to PATH" during installation.
    pause
    exit /b 1
)

echo Python detected!
echo.
echo [Optional Enhancement]
echo To enable advanced mouse movement, window automation, and hardware sensors:
echo Run: pip install psutil pyautogui pillow
echo (Note: The bridge will still run safely using built-in Windows APIs if skipped!)
echo.
echo Starting bridge server on http://127.0.0.1:8765...
python raj_windows_bridge.py
pause
