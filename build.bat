@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================================
echo         Hermes Agent Desktop - Build Script
echo ========================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

REM Get versions
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo [OK] Node.js: %NODE_VERSION%
echo [OK] npm: %NPM_VERSION%

REM Parse arguments
set BUILD_TYPE=setup
set CLEAN=0

:parse_args
if "%~1"=="" goto :start_build
if /i "%~1"=="--clean" set CLEAN=1
if /i "%~1"=="--all" set BUILD_TYPE=all
if /i "%~1"=="--portable" set BUILD_TYPE=portable
if /i "%~1"=="--setup" set BUILD_TYPE=setup
if /i "%~1"=="--dev" set BUILD_TYPE=dev
shift
goto :parse_args

:start_build

REM Clean if requested
if %CLEAN%==1 (
    echo.
    echo [CLEAN] Cleaning build artifacts...
    if exist node_modules rmdir /s /q node_modules
    if exist dist rmdir /s /q dist
    if exist dist-electron rmdir /s /q dist-electron
    if exist release rmdir /s /q release
    echo [OK] Cleaned!
)

REM Check Python setup
if not exist "src\python\python.exe" (
    echo.
    echo [WARNING] Python not setup!
    echo [INFO] Run setup-python.bat first to download Python and Hermes Agent.
    echo.
    pause
    exit /b 1
)

REM Install dependencies
echo.
echo [INSTALL] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Build frontend
echo.
echo [BUILD] Building frontend...
call npm run build:frontend
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)
echo [OK] Frontend built

REM Compile Electron
echo.
echo [BUILD] Compiling Electron TypeScript...
call npm run build:electron
if %errorlevel% neq 0 (
    echo [ERROR] Electron compile failed!
    pause
    exit /b 1
)
echo [OK] Electron compiled

REM Dev mode
if "%BUILD_TYPE%"=="dev" (
    echo.
    echo [DEV] Starting development mode...
    call npm run dev
    exit /b 0
)

REM Build packages
echo.
echo [BUILD] Creating Windows package...

if "%BUILD_TYPE%"=="all" (
    echo Building all formats...
    call npm run build:all
    goto :build_done
)

if "%BUILD_TYPE%"=="portable" (
    echo Building portable...
    call npm run build:win:portable
    goto :build_done
)

REM Default: Setup.exe
echo Building Setup.exe...
call npm run build:win:setup

:build_done
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================================
echo                   BUILD COMPLETE!
echo ========================================================
echo.

if exist release (
    echo Output directory: release\
    echo.
    for %%f in (release\*.exe) do (
        set size=%%~zf
        set /a sizeMB=!size! / 1048576
        echo   - %%~nxf (!sizeMB! MB)
    )
)

echo.
echo Usage:
echo   build.bat              Build Setup.exe (default)
echo   build.bat --all        Build all formats
echo   build.bat --portable   Build portable .exe only
echo   build.bat --dev        Run in dev mode
echo   build.bat --clean      Clean and rebuild
echo.
pause
