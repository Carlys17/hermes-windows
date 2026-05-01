# Hermes Agent Desktop

Desktop application for Hermes Agent - AI Agent for Windows.

## Features

- 🤖 **AI Chat Interface** - Chat with Hermes Agent (Anthropic, OpenAI, OpenRouter, and more)
- 📊 **Dashboard** - System monitoring and quick actions
- ⚙️ **Settings** - Configure model, API keys, and preferences
- 🖥️ **Standalone** - No internet required after setup
- 🚀 **Fast** - Native performance with Electron
- 🔒 **Secure** - Sandboxed renderer, encrypted credentials, command whitelist
- 🔄 **Auto-update** - Check for updates on launch, silent download + install prompt

## Quick Start

### Prerequisites

- **Windows 10/11**
- **Node.js 18+** (https://nodejs.org)
- **Python 3.10+** (https://www.python.org/downloads/)
- **Git** (https://git-scm.com)

### Installation

1. **Clone the repository**
   ```batch
   git clone https://github.com/carly17s/hermes-windows.git
   cd hermes-windows
   ```

2. **Setup Python & Hermes Agent**
   ```batch
   setup-python.bat
   ```
   This will:
   - Download Python embedded distribution
   - Install pip
   - Install Hermes Agent backend dependencies

3. **Install Node.js dependencies**
   ```batch
   npm install
   ```

4. **Build for Windows**
   ```batch
   build.bat
   ```

### Output

After build, you'll find in `release/`:
- `Hermes Agent Desktop-1.0.0-Setup.exe` - Installer
- `Hermes Agent Desktop-1.0.0-Portable.exe` - Portable

## Development

### Run in Dev Mode
```batch
npm run dev
```

This starts:
- Vite dev server (hot-reload)
- Electron window
- Python backend

### Build Options

```batch
build.bat              # Build Setup.exe (default)
build.bat --all        # Build all formats (Setup, Portable)
build.bat --portable   # Build portable .exe only
build.bat --setup      # Build Setup.exe only
build.bat --dev        # Run in dev mode
build.bat --clean      # Clean and rebuild
```

### Testing

```batch
# Run all Jest tests
npm test

# Run tests in watch mode
npm run test:watch

# Run Python backend tests
npm run test:python

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

## Project Structure

```
hermes-windows/
├── src/
│   ├── electron/              # Electron main process
│   │   ├── main.ts            # Entry point, IPC handlers, security
│   │   ├── preload.ts         # Context bridge (renderer → main)
│   │   ├── preload.d.ts       # Type declaration for preload
│   │   ├── logger.ts          # File-based structured logger
│   │   └── __tests__/         # Electron tests
│   ├── frontend/              # React UI
│   │   ├── App.tsx            # Root + ErrorBoundary + routing
│   │   ├── components/
│   │   │   ├── ChatView.tsx       # Chat interface
│   │   │   ├── DashboardView.tsx  # System monitoring
│   │   │   ├── SettingsView.tsx   # API keys, model config
│   │   │   ├── Sidebar.tsx        # Navigation
│   │   │   ├── StatusBar.tsx      # Bottom status bar
│   │   │   ├── Titlebar.tsx       # Custom window titlebar
│   │   │   └── UpdateDialog.tsx   # Update notification
│   │   ├── styles/index.css     # Tailwind CSS
│   │   ├── types.ts             # TypeScript types
│   │   ├── utils.ts             # Shared utilities
│   │   └── __tests__/           # Frontend tests
│   ├── python/                # Python runtime
│   │   └── hermes-agent/
│   │       ├── run_agent.py     # AI agent backend (real API calls)
│   │       ├── cli.py           # CLI command runner
│   │       ├── requirements.txt # Python dependencies
│   │       └── tests/           # Python tests
│   └── assets/                # Icons (16px - 512px, .ico, .svg)
├── .github/workflows/         # CI/CD pipeline
├── eslint.config.js           # ESLint configuration
├── jest.config.js             # Jest test configuration
├── package.json               # Dependencies & scripts
├── electron-builder.yml       # Build config
├── vite.config.ts             # Vite frontend config
├── tsconfig.json              # TypeScript (frontend)
├── tsconfig.electron.json     # TypeScript (electron)
├── build.bat / build.ps1      # Build scripts
├── setup-python.bat           # Python + Hermes Agent setup
├── quickstart.bat             # One-click start
├── install.bat                # Full installer
├── .editorconfig              # Editor configuration
├── .npmrc                     # NPM configuration
└── .prettierc                 # Prettier configuration
```

## Configuration

### API Keys

Set your API keys in Settings or create `.env` file:

```env
OPENROUTER_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### Model Selection

Change default model in Settings or `config.yaml`:

```yaml
model:
  default: anthropic/claude-sonnet-4
  provider: anthropic
```

Supported providers:
- **Anthropic** (Claude Sonnet 4, Opus 4)
- **OpenAI** (GPT-4o, GPT-4o Mini)
- **OpenRouter** (all models via proxy)
- **Alibaba DashScope** (Qwen 3.5 Plus, Flash, Max, Coder)
- **Xiaomi MiMo** (MiMo v2.5 Pro, Flash)
- **DeepSeek** (DeepSeek Chat)
- **Google** (Gemini 2.0 Flash)

## Building from Source

### Windows Build

```batch
# 1. Setup Python
setup-python.bat

# 2. Install dependencies
npm install

# 3. Build
npm run build:win
```

### Output Formats

- **NSIS Setup.exe** - Traditional installer
- **Portable .exe** - No installation required

## Logging

Logs are stored at `%APPDATA%\hermes-config\logs\main.log` (production) or stdout (dev mode). Log rotation: max 5 files x 10MB.

## CI/CD

This project uses GitHub Actions for automated testing and building:
- **Push to main**: Runs tests + builds Windows installer
- **Pull requests**: Runs tests
- **Tag releases** (`v*`): Builds and publishes to GitHub Releases

See `.github/workflows/build.yml` for details.

## Troubleshooting

### Build fails
```batch
# Clean and rebuild
build.bat --clean
```

### Python not found
- Install Python 3.10+ from https://www.python.org
- Check "Add Python to PATH" during installation

### Dependencies error
```batch
# Delete node_modules and reinstall
rmdir /s /q node_modules
npm install
```

### Electron-builder error
```batch
# Install electron-builder globally
npm install -g electron-builder

# Build again
npm run build:win
```

### SmartScreen warning (unsigned)
The installer is not code-signed. Windows SmartScreen will show a warning. Click "More info" → "Run anyway".

## License

MIT License - see [LICENSE](LICENSE)

## Credits

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) - Nous Research
- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [React](https://react.dev/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Vite](https://vitejs.dev/) - Build tool
- [Lucide](https://lucide.dev/) - Icons

## Support

- GitHub Issues: https://github.com/carly17s/hermes-windows/issues
- Documentation: https://hermes-agent.nousresearch.com/docs/
