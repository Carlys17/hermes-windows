@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================================
echo         Hermes Agent Desktop - Python Setup
echo ========================================================
echo.

set INSTALL_UPSTREAM=0

:parse_args
if "%~1"=="" goto :start_setup
if /i "%~1"=="--with-upstream" set INSTALL_UPSTREAM=1
shift
goto :parse_args

:start_setup

REM Create Python directory
if not exist "src\python" mkdir "src\python"

REM Download embedded Python only when it is missing. The build expects this path.
if not exist "src\python\python.exe" (
    echo [INFO] Downloading Python embedded distribution...
    set PYTHON_EMBED_URL=https://www.python.org/ftp/python/3.11.8/python-3.11.8-embed-amd64.zip
    set PYTHON_EMBED_ZIP=python-embed.zip

    curl -L -o !PYTHON_EMBED_ZIP! !PYTHON_EMBED_URL!
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to download Python embedded distribution.
        pause
        exit /b 1
    )

    echo [INFO] Extracting Python...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '!PYTHON_EMBED_ZIP!' -DestinationPath 'src\python' -Force"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to extract Python.
        pause
        exit /b 1
    )

    del !PYTHON_EMBED_ZIP! >nul 2>nul
) else (
    echo [OK] Embedded Python already exists: src\python\python.exe
)

REM Enable site-packages for embedded Python.
if exist "src\python\python311._pth" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Content 'src\python\python311._pth') -replace '#import site', 'import site' | Set-Content 'src\python\python311._pth'"
)

REM Install pip only when it is missing.
if not exist "src\python\Scripts\pip.exe" (
    echo [INFO] Installing pip...
    curl -L -o "src\python\get-pip.py" https://bootstrap.pypa.io/get-pip.py
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to download get-pip.py.
        pause
        exit /b 1
    )

    "src\python\python.exe" "src\python\get-pip.py" --no-warn-script-location
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install pip.
        pause
        exit /b 1
    )

    del "src\python\get-pip.py" >nul 2>nul
) else (
    echo [OK] pip already installed.
)

"src\python\python.exe" -m pip install --upgrade pip --no-warn-script-location
if !errorlevel! neq 0 (
    echo [ERROR] Failed to upgrade pip.
    pause
    exit /b 1
)

REM The repository ships a desktop wrapper in src\python\hermes-agent.
REM Do not clone NousResearch/hermes-agent into that same directory: it would
REM overwrite the wrapper, and the wrapper is what Electron starts.
if not exist "src\python\hermes-agent\run_agent.py" (
    echo [ERROR] Desktop backend wrapper is missing: src\python\hermes-agent\run_agent.py
    echo Restore it from the repository before building.
    pause
    exit /b 1
)

if !INSTALL_UPSTREAM! equ 1 (
    echo.
    echo [INFO] Installing upstream Hermes Agent package into embedded Python...
    echo [WARN] NousResearch/hermes-agent currently documents native Windows as unsupported.
    echo [WARN] Use this only for experimentation; WSL2 remains the recommended path.
    "src\python\python.exe" -m pip install --upgrade "hermes-agent @ git+https://github.com/NousResearch/hermes-agent.git" --no-warn-script-location
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install upstream Hermes Agent package.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Skipping upstream Hermes package install.
    echo [INFO] Use setup-python.bat --with-upstream to attempt it experimentally.
)

echo.
echo ========================================================
echo                Python Setup Complete!
echo ========================================================
echo.
echo Python runtime: src\python\python.exe
echo Desktop backend wrapper: src\python\hermes-agent\run_agent.py
if !INSTALL_UPSTREAM! equ 0 (
    echo Upstream Hermes Agent: not installed ^(stub/wrapper mode^)
) else (
    echo Upstream Hermes Agent: install attempted
)
echo.
echo You can now run: npm install && npm run build:win
echo.
pause
