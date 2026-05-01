# Hermes Agent Desktop

Desktop shell for Hermes Agent on Windows, built with Electron, React, and an embedded Python runtime.

> Status: pre-release. The desktop UI, packaging config, and local Python wrapper are present, but upstream `NousResearch/hermes-agent` currently documents native Windows as unsupported and recommends WSL2. This app can build and run in wrapper/stub mode; full upstream Hermes integration on native Windows is experimental.

## Features

- AI chat shell with a Python backend wrapper
- Dashboard with local system information
- Settings for model preferences and encrypted API key storage
- Windows x64 build targets: NSIS setup and portable EXE
- Hardened Electron defaults: context isolation, sandbox, limited preload API, and CSP

## Quick Start

### Prerequisites

- Windows 10/11
- Node.js 18+
- Git
- Internet access during setup/build

You do not need a system Python install for the desktop build. `setup-python.bat` downloads the Python embedded runtime into `src/python`.

### Installation

```batch
git clone https://github.com/Carlys17/hermes-windows.git
cd hermes-windows
setup-python.bat
npm install
```

`setup-python.bat` is idempotent. It:

- downloads Python 3.11 embedded if `src\python\python.exe` is missing
- enables `site-packages`
- installs or updates pip
- validates that the desktop backend wrapper exists

It does **not** clone upstream Hermes into `src\python\hermes-agent`; that directory belongs to the desktop wrapper Electron starts.

### Optional Experimental Upstream Install

```batch
setup-python.bat --with-upstream
```

This attempts to install upstream `NousResearch/hermes-agent` into the embedded Python runtime. It is experimental because upstream Hermes currently recommends WSL2 rather than native Windows.

For the fully supported Hermes Agent experience on Windows, install Hermes inside WSL2 using the upstream documentation: https://hermes-agent.nousresearch.com/docs/

## Build

```batch
build.bat
```

Build variants:

```batch
build.bat --setup      # NSIS installer only
build.bat --portable   # Portable .exe only
build.bat --all        # Setup + Portable
build.bat --dev        # Run in dev mode
build.bat --clean      # Clean and rebuild
```

After build, output appears in `release/`.

## Development

```batch
npm run dev
```

This starts the Vite dev server and Electron. The Python backend wrapper starts from `src/python/hermes-agent/run_agent.py`.

## Project Structure

```text
hermes-windows/
├── src/
│   ├── electron/              # Electron main process and preload bridge
│   ├── frontend/              # React UI
│   ├── python/                # Embedded Python runtime after setup
│   │   └── hermes-agent/      # Desktop backend wrapper, not upstream clone
│   └── assets/                # App icons
├── electron-builder.yml       # Windows packaging config
├── vite.config.ts             # Vite frontend config
├── package.json               # Node dependencies and scripts
└── PRODUCTION-READY.md        # Release-readiness checklist and limitations
```

## Configuration

Settings are stored through Electron in a local config store. API keys are saved with Electron `safeStorage` when available.

Important: the current desktop wrapper does not yet automatically forward keys saved in the Settings UI into a newly installed upstream Hermes runtime. For upstream Hermes experiments, configure credentials in the environment or Hermes config expected by upstream Hermes.

## Current Limitations

- No published GitHub release artifacts yet.
- No automated tests or CI workflow yet.
- Code signing is disabled, so Windows SmartScreen warnings are expected.
- Native Windows upstream Hermes support is experimental; WSL2 remains the supported path.
- The bundled desktop wrapper falls back to local stub responses when upstream Hermes is unavailable.

## License

MIT License - see [LICENSE](LICENSE)

## Credits

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) - Nous Research
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [Lucide](https://lucide.dev/)
