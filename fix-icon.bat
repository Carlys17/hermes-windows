@echo off
echo [INFO] Generating icon.ico from icon.png...
powershell -NoProfile -ExecutionPolicy Bypass -File "fix-icon.ps1"
if %errorlevel% neq 0 (
    echo [WARNING] Icon generation failed - using placeholder icon.
) else (
    echo [OK] icon.ico is ready.
)
