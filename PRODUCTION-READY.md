# Hermes Agent Desktop - Production Readiness Guide

## Current Status

Repository: https://github.com/Carlys17/hermes-windows
Branch: `main`
Version: `1.0.0`
Status: **pre-release / not production-ready yet**

The project has useful security hardening and a working Electron shell, but it should not be described as production-ready until the Windows build, backend integration, installer, and release checks below have passed.

Important upstream note: `NousResearch/hermes-agent` currently documents native Windows as unsupported and recommends WSL2. Native Windows upstream integration in this desktop app is therefore experimental.

---

## Completed Work

### Security Hardening

- Command whitelist limits command execution to a small read-only set.
- Dangerous commands such as `python`, `pip`, `git`, `node`, and `npm` are not exposed through the renderer command channel.
- Path separator and shell metacharacter checks reduce command-whitelist bypass risk.
- Electron renderer uses `contextIsolation`, `nodeIntegration: false`, and `sandbox: true`.
- Content-Security-Policy headers are configured.
- Command execution has a 30 second timeout, 1 MB output cap, and a max concurrent command limit.
- Credential keys are validated before storage.
- API keys are stored through Electron `safeStorage` when available.
- Global main-process error handlers are present.

### Runtime And Build Setup

- `setup-python.bat` now downloads and prepares embedded Python idempotently.
- The script no longer clones upstream Hermes into `src\python\hermes-agent`, because that directory belongs to the Electron desktop wrapper.
- Optional experimental upstream install is available with `setup-python.bat --with-upstream`.
- Windows x64 NSIS and portable targets are configured.
- Code signing is disabled until a signing certificate is available.

### Frontend UX

- Error boundary prevents a blank renderer on React crashes.
- Chat scroll behavior avoids forcing the user to the bottom when they scrolled up.
- Settings has retry/error states.
- Numeric settings are clamped to safe ranges.
- Textarea length is capped.
- Icon buttons include accessible labels.

---

## Known Limitations

### Native Hermes Backend

The bundled backend wrapper can run in stub mode. It can optionally try to use an installed upstream `hermes-agent` package, but this is experimental on native Windows because upstream Hermes recommends WSL2.

Required before production:

- Decide whether the supported production path is native Windows, WSL2 bridge, or UI-only wrapper.
- If native Windows is required, validate upstream Hermes dependencies on Windows and pin a known-good upstream commit/tag.
- Wire Settings UI credentials into the backend runtime safely, or clearly require `.env` / upstream config.
- Add end-to-end chat tests with a real provider key in a secure CI environment.

### Code Signing

`signAndEditExecutable: false` means Windows SmartScreen will warn users. Production distribution should use a proper code signing certificate or a trusted signing service.

### Tests

There are no automated tests yet. Add at minimum:

- unit tests for command parsing/validation
- renderer tests for Settings and Chat flows
- backend wrapper tests for stub mode and upstream-missing mode
- smoke build on Windows

### CI/CD

There is no GitHub Actions workflow yet. A release workflow should build on `windows-latest`, upload artifacts, and attach them to tagged releases.

---

## Windows Build Steps

```batch
git clone https://github.com/Carlys17/hermes-windows.git
cd hermes-windows
setup-python.bat
npm install
build.bat
```

Optional experimental upstream package install:

```batch
setup-python.bat --with-upstream
```

Build variants:

```batch
build.bat --setup      # NSIS installer only
build.bat --portable   # Portable .exe only
build.bat --all        # Setup + Portable
```

Expected output directory: `release/`.

---

## Architecture Overview

```text
hermes-windows/
├── src/
│   ├── electron/              # Electron main process, IPC handlers, security checks
│   ├── frontend/              # React UI
│   ├── python/                # Embedded Python runtime after setup
│   │   └── hermes-agent/      # Desktop backend wrapper, not upstream clone
│   └── assets/                # App icons
├── electron-builder.yml       # Windows build config
├── vite.config.ts             # Vite frontend config
├── tsconfig.json              # TypeScript frontend config
├── tsconfig.electron.json     # TypeScript Electron config
└── package.json               # Dependencies and scripts
```

## Data Flow

```text
User Input (Chat)
    ↓
React ChatView
    ↓ IPC: window.electronAPI.sendChat(message)
Electron Main
    ↓ stdin JSON: { type: "chat", message }
Python desktop backend wrapper
    ↓ stdout plain text
Electron Main
    ↓ IPC: python:message
React ChatView
    ↓ Render response
```

---

## Production Release Checklist

- [ ] Build successfully on a clean Windows 10/11 machine.
- [ ] Run `setup-python.bat` twice to confirm idempotency.
- [ ] Run `setup-python.bat --with-upstream` on Windows and document whether upstream install is supported or experimental.
- [ ] Test Dashboard, Chat, Settings, Sidebar, Titlebar, and StatusBar.
- [ ] Test Settings save/load for API keys and non-sensitive config.
- [ ] Confirm how API keys reach the backend runtime.
- [ ] Test chat behavior with no upstream Hermes installed.
- [ ] Test chat behavior with upstream Hermes installed and valid credentials.
- [ ] Test bad API key and network-error handling.
- [ ] Add unit/integration tests.
- [ ] Add GitHub Actions build workflow.
- [ ] Sign Windows executables or document SmartScreen warning clearly.
- [ ] Create a Git tag, GitHub Release, and attach setup/portable artifacts.

---

Last updated: 2026-05-01
