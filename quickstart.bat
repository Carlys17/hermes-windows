@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================================
echo         Hermes Agent Desktop - Quick Start
echo ========================================================
echo.
echo This script will:
echo   1. Check prerequisites (Node.js, Python, Git)
echo   2. Setup Python and Hermes Agent
echo   3. Build the Windows application
echo.
echo Press any key to continue...
pause >nul

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo Recommended version: 18.x or later
    echo.
    pause
    exit /b 1
)

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Python not found!
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

REM Check Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Git not found!
    echo.
    echo Please install Git from: https://git-scm.com
    echo.
    pause
    exit /b 1
)

echo [OK] All prerequisites check passed!
echo.

REM Step 1: Setup Python
echo ========================================================
echo Step 1: Setting up Python and Hermes Agent
echo ========================================================
echo.

call setup-python.bat
if %errorlevel% neq 0 (
    echo [ERROR] Python setup failed!
    pause
    exit /b 1
)

REM Step 2: Build application
echo.
echo ========================================================
echo Step 2: Building Windows Application
echo ========================================================
echo.

call build.bat --all
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================================
echo              SETUP COMPLETE!
echo ========================================================
echo.
echo Your Hermes Agent Desktop is ready!
echo.
echo Output files are in: release\
echo.
echo To run in dev mode: build.bat --dev
echo To clean build: build.bat --clean
echo.
pause
