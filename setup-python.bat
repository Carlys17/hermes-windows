@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================================
echo         Hermes Agent Desktop - Python Setup
echo ========================================================
echo.

REM Check if Python is available on system
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3.10+ from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%a in ('python --version 2^>^&1') do set PYTHON_VERSION=%%a
echo [OK] Python found: %PYTHON_VERSION%

REM Create Python directory structure
if not exist "src\python" mkdir "src\python"
if not exist "src\python\hermes-agent" mkdir "src\python\hermes-agent"

REM ── Step 1: Download embedded Python ────────────────────────────
echo.
echo [INFO] Downloading Python 3.11.8 embedded distribution...
set PYTHON_EMBED_URL=https://www.python.org/ftp/python/3.11.8/python-3.11.8-embed-amd64.zip
set PYTHON_EMBED_ZIP=%TEMP%\python-embed.zip

REM Skip if already downloaded
if exist "src\python\python.exe" (
    echo [SKIP] Python embedded already present, skipping download.
    goto :install_hermes
)

curl -L --progress-bar -o "%PYTHON_EMBED_ZIP%" "%PYTHON_EMBED_URL%"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download Python embedded!
    echo Please check your internet connection.
    pause
    exit /b 1
)

REM Extract Python embedded
echo [INFO] Extracting Python embedded...
powershell -NoProfile -Command "Expand-Archive -Path '%PYTHON_EMBED_ZIP%' -DestinationPath 'src\python' -Force"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to extract Python!
    pause
    exit /b 1
)

del "%PYTHON_EMBED_ZIP%" 2>nul

REM Enable import site (required for pip)
echo [INFO] Enabling site-packages...
if exist "src\python\python311._pth" (
    powershell -NoProfile -Command "(Get-Content 'src\python\python311._pth') -replace '#import site', 'import site' | Set-Content 'src\python\python311._pth'"
)

REM ── Step 2: Install pip into embedded Python ─────────────────────
echo.
echo [INFO] Installing pip into embedded Python...
curl -L -o "%TEMP%\get-pip.py" https://bootstrap.pypa.io/get-pip.py
if %errorlevel% neq 0 (
    echo [WARNING] Could not download get-pip.py — pip install skipped.
    goto :install_hermes
)

"src\python\python.exe" "%TEMP%\get-pip.py" --no-warn-script-location 2>nul
del "%TEMP%\get-pip.py" 2>nul
echo [OK] pip installed.

:install_hermes
REM ── Step 3: Setup Hermes Agent stub (no external clone needed) ───
echo.
echo [INFO] Setting up Hermes Agent backend...

REM The hermes-agent files are already in src/python/hermes-agent/
REM (cli.py and run_agent.py are part of this repo)
REM Only install requirements if requirements.txt exists
if exist "src\python\hermes-agent\requirements.txt" (
    echo [INFO] Installing Python requirements...
    if exist "src\python\python.exe" (
        "src\python\python.exe" -m pip install -r "src\python\hermes-agent\requirements.txt" --no-warn-script-location
    ) else (
        python -m pip install -r "src\python\hermes-agent\requirements.txt"
    )
    echo [OK] Requirements installed.
) else (
    echo [OK] No requirements.txt found — using built-in stub backend.
)

echo.
echo ========================================================
echo                Python Setup Complete!
echo ========================================================
echo.
echo Python embedded: src\python\python.exe
echo Hermes Agent:    src\python\hermes-agent\
echo.
echo Next step: run  npm install  then  build.bat
echo.
endlocal
exit /b 0
