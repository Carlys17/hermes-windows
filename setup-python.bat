@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================================
echo         Hermes Agent Desktop - Python Setup
echo ========================================================
echo.

REM Check if Python is available
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
echo [OK] Python: %PYTHON_VERSION%

REM Create Python directory
if not exist "src\python" mkdir "src\python"

REM Download embedded Python
echo.
echo [INFO] Downloading Python embedded distribution...
set PYTHON_EMBED_URL=https://www.python.org/ftp/python/3.11.8/python-3.11.8-embed-amd64.zip
set PYTHON_EMBED_ZIP=python-embed.zip

curl -L -o %PYTHON_EMBED_ZIP% %PYTHON_EMBED_URL%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download Python!
    pause
    exit /b 1
)

REM Extract Python
echo [INFO] Extracting Python...
powershell -Command "Expand-Archive -Path '%PYTHON_EMBED_ZIP%' -DestinationPath 'src\python' -Force"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to extract Python!
    pause
    exit /b 1
)

REM Cleanup
del %PYTHON_EMBED_ZIP%

REM Enable pip
echo [INFO] Enabling pip...
cd src\python

REM Uncomment import site in python311._pth
powershell -Command "(Get-Content 'python311._pth') -replace '#import site', 'import site' | Set-Content 'python311._pth'"

REM Download get-pip.py
curl -L -o get-pip.py https://bootstrap.pypa.io/get-pip.py
python.exe get-pip.py --no-warn-script-location
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install pip!
    pause
    exit /b 1
)

REM Cleanup
del get-pip.py

REM Install Hermes Agent
echo.
echo [INFO] Installing Hermes Agent...
cd ..\..

REM Clone Hermes Agent
if not exist "src\python\hermes-agent" (
    git clone https://github.com/NousResearch/hermes-agent.git src\python\hermes-agent
)

REM Install dependencies
cd src\python\hermes-agent
..\python.exe -m pip install -r requirements.txt --no-warn-script-location
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Hermes dependencies!
    pause
    exit /b 1
)

cd ..\..\..

echo.
echo ========================================================
echo                Python Setup Complete!
echo ========================================================
echo.
echo Python is installed in: src\python\
echo Hermes Agent is in: src\python\hermes-agent\
echo.
echo You can now run: npm run build:win
echo.
pause
