# Hermes Agent Desktop — Production Ready Guide

## Status Saat Ini

Repository: https://github.com/Carlys17/hermes-windows
Branch: `main` (3 commits ahead, sudah di-push)
Version: `1.0.0`

---

## Apa yang Sudah Dikerjakan

### Security Hardening (Critical)

- **Command whitelist** — hanya command read-only yang diizinkan (`hermes`, `ls`, `cat`, `echo`, `pwd`, `whoami`, `uname`, `df`, `free`, `ps`, `head`, `tail`, `grep`, `find`, `wc`)
- **Dangerous commands DIHAPUS** — `python`, `pip`, `git`, `node`, `npm` tidak ada di whitelist karena bisa arbitrary code execution via `-c`/`-e` flags
- **Path separator bypass prevention** — input yang mengandung `/` atau `\` langsung ditolak
- **Null byte injection prevention** — `\0` ditambahkan ke dangerous chars
- **Electron sandbox enabled** — `sandbox: true` di BrowserWindow
- **Content-Security-Policy headers** — prevent XSS dan inline script injection
- **Concurrency limit** — max 5 command concurrent, sisanya di-queue
- **Timeout + output cap** — 30s timeout per command, 1MB max output
- **Credential key validation** — regex `/^[a-zA-Z0-9_-]{1,64}$/` untuk API key names
- **Global error handlers** — `uncaughtException` dan `unhandledRejection` ditangkap

### electron-store ESM/CJS Fix

- electron-store v8 adalah ESM-only, tapi Electron main process pakai CJS
- Fix: lazy dynamic import via `async function getStore()`
- Tidak crash saat startup

### UX Fixes

- **Error boundary** di React — kalau component crash, user dapat error message + retry button, bukan blank screen
- **Smart scroll** — kalau user scroll up manual, chat tidak force-scroll ke bawah
- **Load error state** di Settings — kalau gagal load config, ada retry button
- **Clamp warnings** — input numeric di Settings kasih warning kalau di luar range
- **maxLength on textarea** — prevent input terlalu panjang
- **aria-labels** di semua icon buttons — accessibility
- **role=navigation** di sidebar — screen reader support
- **copyTimeout cleanup** — prevent memory leak on unmount

### Build Config

- **Target:** Windows x64 only (macOS/Linux dihapus, ini Windows-only project)
- **Output formats:** NSIS Setup.exe + Portable .exe (MSI dihapus)
- **Code signing:** disabled (`signAndEditExecutable: false`) — belum punya cert
- **Auto-updater:** config ada (`publish: github`), periodic check setiap 4 jam
- **asar:** enabled untuk security dan performance
- **extraResources:** Python runtime + Hermes Agent source di-bundle

### Python Backend

- `cli.py` whitelist disinkronisasi dengan Electron `main.ts`
- Path separator rejection di Python juga
- Dangerous chars check di args

---

## Yang Perlu Dilakukan di Windows

### Step 1: Clone & Install

```batch
git clone https://github.com/Carlys17/hermes-windows.git
cd hermes-windows
setup-python.bat
npm install
```

### Step 2: Build

```batch
build.bat
```

Atau pilih format tertentu:

```batch
build.bat --setup      # NSIS installer saja
build.bat --portable   # Portable .exe saja
build.bat --all        # Semua format
```

### Step 3: Output

Hasil build ada di `release/`:

- `Hermes Agent Desktop-1.0.0-Setup.exe` — Installer (rekomendasi untuk distribusi)
- `Hermes Agent Desktop-1.0.0-Portable.exe` — Portable, tidak perlu install

### Step 4: Test

1. Jalankan Setup.exe atau Portable.exe
2. Cek Dashboard — harusnya ada system info
3. Cek Settings — test simpan API key, ganti model
4. Cek Chat — test kirim pesan (butuh API key yang valid)
5. Cek Titlebar — minimize/maximize/close harusnya jalan
6. Cek Sidebar — navigasi antar view harusnya smooth

---

## Known Issues & Limitations

### ⚠️ Code Signing

`signAndEditExecutable: false` — Windows SmartScreen akan muncul warning "Windows protected your PC". User harus klik "More info" → "Run anyway".

**Fix:** Beli code signing certificate (EV cert ~$200/tahun) atau gunakan SignPath.io (free untuk open source).

### ⚠️ Python Backend Dependency

App meng-clone Hermes Agent source dari GitHub saat `setup-python.bat`. Kalau Hermes upstream update breaking changes, desktop app bisa pecah.

**Fix:** Pin ke specific commit/tag di `setup-python.bat`:
```batch
git clone --branch v1.0.0 --depth 1 https://github.com/NousResearch/hermes-agent.git
```

### ⚠️ Tidak Ada Tests

Zero test files, zero coverage. Kalau mau tambah:

```batch
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

Buat test di `src/__tests__/` atau `src/frontend/__tests__/`.

### ⚠️ Tidak Ada CI/CD

Belum ada GitHub Actions workflow. Kalau mau auto-build setiap push:

Buat file `.github/workflows/build.yml`:

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            release/*.exe
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Architecture Overview

```
hermes-windows/
├── src/
│   ├── electron/              # Electron main process
│   │   ├── main.ts            # Entry point, IPC handlers, security
│   │   └── preload.ts         # Context bridge (renderer ↔ main)
│   ├── frontend/              # React UI
│   │   ├── App.tsx            # Root + ErrorBoundary + routing
│   │   ├── components/
│   │   │   ├── ChatView.tsx   # Chat interface
│   │   │   ├── DashboardView.tsx  # System monitoring
│   │   │   ├── SettingsView.tsx   # API keys, model config
│   │   │   ├── Sidebar.tsx    # Navigation
│   │   │   ├── StatusBar.tsx  # Bottom status bar
│   │   │   └── Titlebar.tsx   # Custom window titlebar
│   │   ├── styles/index.css   # Tailwind CSS
│   │   ├── types.ts           # TypeScript types
│   │   └── utils.ts           # Shared utilities
│   ├── python/                # Python runtime
│   │   ├── hermes-agent/      # Hermes Agent source (cloned)
│   │   └── cli.py             # CLI wrapper
│   └── assets/                # Icons (16px - 512px, .ico, .svg)
├── electron-builder.yml       # Build config
├── vite.config.ts             # Vite frontend config
├── tsconfig.json              # TypeScript (frontend)
├── tsconfig.electron.json     # TypeScript (electron)
└── package.json               # Dependencies & scripts
```

## Data Flow

```
User Input (Chat)
    ↓
React (ChatView.tsx)
    ↓ IPC: window.electronAPI.sendMessage()
Electron Main (main.ts)
    ↓ spawn() → Python CLI
Python (cli.py → hermes-agent)
    ↓ Response
Electron Main
    ↓ IPC: mainWindow.webContents.send()
React (ChatView.tsx)
    ↓ Render response
```

## Security Model

- **Renderer** (React) tidak punya akses ke Node.js — hanya bisa lewat `window.electronAPI`
- **Preload** expose API terbatas via `contextBridge.exposeInMainWorld()`
- **Main process** validasi semua input sebelum eksekusi
- **Command whitelist** — hanya command read-only yang diizinkan
- **No arbitrary code execution** — `python`, `node`, `git`, `npm` dihapus dari whitelist
- **Sandbox enabled** — renderer tidak bisa akses sistem file langsung
- **CSP headers** — prevent XSS dan injection

---

## Checklist Sebelum Distribusi

- [ ] Build di Windows machine (VPS Linux tidak bisa build Windows .exe)
- [ ] Test semua view (Dashboard, Chat, Settings)
- [ ] Test API key save/load
- [ ] Test model switching
- [ ] Test chat dengan API key valid
- [ ] Test error handling (API key salah, network error)
- [ ] Test installer (NSIS) dan portable
- [ ] Cek SmartScreen warning — inform user cara bypass
- [ ] Bump version di `package.json` kalau release baru
- [ ] Git tag: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] GitHub Release dengan .exe attach

---

*Last updated: 2026-05-01*
*Commits: a78fb92, 561e3f9, 78d455b (3 commits, all pushed to main)*
