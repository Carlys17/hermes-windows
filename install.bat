@echo off
setlocal enabledelayedexpansion
title Hermes Agent Desktop - Install

echo.
echo  ============================================================
echo    HERMES AGENT DESKTOP — Installer Otomatis v1.0.0
echo  ============================================================
echo.

REM ── Cek Node.js ──────────────────────────────────────────────────
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [X] Node.js TIDAK ditemukan!
    echo.
    echo  Silakan install Node.js 18+ dari:
    echo    https://nodejs.org/en/download/
    echo.
    echo  Setelah install, jalankan kembali install.bat
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  [v] Node.js   : %NODE_VER%

REM ── Cek npm ──────────────────────────────────────────────────────
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo  [X] npm TIDAK ditemukan! Install ulang Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo  [v] npm       : v%NPM_VER%

REM ── Cek Python ───────────────────────────────────────────────────
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo  [!] Python tidak ditemukan di PATH (opsional untuk build produksi)
    echo      Python tetap diperlukan untuk menjalankan AI backend.
    echo      Silakan install Python 3.10+ dari https://www.python.org
    set HAVE_PYTHON=0
) else (
    for /f "tokens=2" %%a in ('python --version 2^>^&1') do set PY_VER=%%a
    echo  [v] Python    : %PY_VER%
    set HAVE_PYTHON=1
)

echo.
echo  ============================================================
echo   Langkah 1/4: Setup Python Embedded + Hermes Agent Backend
echo  ============================================================
echo.

REM Jalankan setup-python.bat
call setup-python.bat
if %errorlevel% neq 0 (
    echo.
    echo  [!] Setup Python gagal. Melanjutkan tanpa embedded Python...
    echo      (App bisa dijalankan dev mode dengan Python sistem)
)

echo.
echo  ============================================================
echo   Langkah 2/4: Install Node.js Dependencies
echo  ============================================================
echo.

call npm install
if %errorlevel% neq 0 (
    echo.
    echo  [X] npm install GAGAL!
    echo.
    echo  Coba solusi:
    echo    1. Jalankan sebagai Administrator
    echo    2. Hapus node_modules: rmdir /s /q node_modules
    echo    3. Clear cache: npm cache clean --force
    echo    4. Install ulang: npm install
    echo.
    pause
    exit /b 1
)
echo  [v] Dependencies berhasil diinstall

echo.
echo  ============================================================
echo   Langkah 3/4: Build Aplikasi Windows
echo  ============================================================
echo.

REM Tanya user mau build atau dev mode
echo  Pilih mode:
echo    [1] Build untuk distribusi (Setup.exe + Portable.exe)
echo    [2] Jalankan langsung dalam mode Development (lebih cepat)
echo.
set /p BUILD_CHOICE="  Pilihan (default: 1): "

if "%BUILD_CHOICE%"=="2" (
    echo.
    echo  ============================================================
    echo   Menjalankan Development Mode...
    echo   Buka browser atau tunggu Electron window terbuka
    echo   Tekan Ctrl+C untuk keluar
    echo  ============================================================
    echo.
    call npm run dev
    exit /b 0
)

REM Default: build production
echo.
echo  [INFO] Membangun aplikasi (proses ini bisa 2-10 menit)...
echo.

call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  [X] Build frontend/electron GAGAL!
    pause
    exit /b 1
)

echo  [v] Build frontend dan Electron berhasil

echo.
echo  [INFO] Membuat installer Windows...
call npx electron-builder --win nsis portable --config electron-builder.yml
if %errorlevel% neq 0 (
    echo.
    echo  [X] Packaging GAGAL! Coba jalankan sebagai Administrator.
    echo.
    echo  Atau coba build manual:
    echo    npm run build:win
    echo.
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo   Langkah 4/4: Selesai!
echo  ============================================================
echo.

if exist release (
    echo  File installer tersedia di folder  release\ :
    echo.
    for %%f in (release\*.exe) do (
        set /a SIZE_MB=%%~zf / 1048576
        echo    - %%~nxf  (!SIZE_MB! MB)
    )
    echo.
    echo  Klik dua kali file Setup.exe untuk install,
    echo  atau jalankan file Portable.exe langsung tanpa install.
    echo.
    REM Buka folder release otomatis
    start "" "release"
) else (
    echo  [!] Folder release\ tidak ditemukan.
    echo      Coba jalankan: npm run build:win
)

echo.
pause
