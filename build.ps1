# Hermes Agent Desktop - Build Script (PowerShell)
# Usage: .\build.ps1 [-Clean] [-All] [-Portable] [-Setup] [-Dev]

param(
    [switch]$Clean,
    [switch]$All,
    [switch]$Portable,
    [switch]$Setup,
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         Hermes Agent Desktop - Build Script" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "Please install from: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm not found!" -ForegroundColor Red
    exit 1
}

# Check Python setup
if (-not (Test-Path "src\python\python.exe")) {
    Write-Host ""
    Write-Host "[WARNING] Python not setup!" -ForegroundColor Yellow
    Write-Host "[INFO] Run setup-python.bat first." -ForegroundColor Yellow
    exit 1
}

# Clean build
if ($Clean) {
    Write-Host ""
    Write-Host "[CLEAN] Cleaning build artifacts..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist-electron
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue release
    Write-Host "[OK] Cleaned!" -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "[INSTALL] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dependencies installed" -ForegroundColor Green

# Build frontend
Write-Host ""
Write-Host "[BUILD] Building frontend..." -ForegroundColor Yellow
npm run build:frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Frontend built" -ForegroundColor Green

# Compile Electron
Write-Host ""
Write-Host "[BUILD] Compiling Electron TypeScript..." -ForegroundColor Yellow
npm run build:electron
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Electron compile failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Electron compiled" -ForegroundColor Green

# Dev mode
if ($Dev) {
    Write-Host ""
    Write-Host "[DEV] Starting development mode..." -ForegroundColor Cyan
    npm run dev
    exit 0
}

# Build packages
Write-Host ""
Write-Host "[BUILD] Creating Windows package..." -ForegroundColor Yellow

if ($All) {
    Write-Host "Building all formats..." -ForegroundColor Yellow
    npm run build:all
} elseif ($Portable) {
    Write-Host "Building portable..." -ForegroundColor Yellow
    npm run build:win:portable
} else {
    Write-Host "Building Setup.exe..." -ForegroundColor Yellow
    npm run build:win:setup
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}

# Show output
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "                   BUILD COMPLETE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

$outputDir = Join-Path $PSScriptRoot "release"
if (Test-Path $outputDir) {
    Write-Host "Output directory: $outputDir" -ForegroundColor Cyan
    Get-ChildItem -Path $outputDir -Include "*.exe" -Recurse | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  - $($_.Name) ($sizeMB MB)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  .\build.ps1              # Build Setup.exe (default)"
Write-Host "  .\build.ps1 -All         # Build all formats"
Write-Host "  .\build.ps1 -Portable    # Build portable .exe only"
Write-Host "  .\build.ps1 -Dev         # Run in dev mode"
Write-Host "  .\build.ps1 -Clean       # Clean and rebuild"
Write-Host ""
