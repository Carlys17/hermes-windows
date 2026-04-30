# Hermes Agent Desktop

Desktop application for Hermes Agent - AI Agent for Windows.

## Features

- 🤖 **AI Chat Interface** - Chat with Hermes Agent
- 📊 **Dashboard** - System monitoring and quick actions
- ⚙️ **Settings** - Configure model, API keys, and preferences
- 🖥️ **Standalone** - No internet required after setup
- 🚀 **Fast** - Native performance with Electron

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
   - Clone Hermes Agent repository
   - Install all dependencies

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
- `Hermes Agent Desktop-1.0.0.exe` - Portable

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
build.bat --all        # Build all formats (Setup, Portable, MSI)
build.bat --portable   # Build portable .exe only
build.bat --setup      # Build Setup.exe only
build.bat --dev        # Run in dev mode
build.bat --clean      # Clean and rebuild
```

## Project Structure

```
hermes-windows/
├── src/
│   ├── electron/          # Electron main process
│   │   ├── main.ts        # Main entry point
│   │   └── preload.ts     # Preload script
│   ├── frontend/          # React frontend
│   │   ├── components/    # UI components
│   │   ├── styles/        # CSS styles
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── python/            # Python runtime & Hermes Agent
│   │   ├── python.exe     # Python executable (Windows)
│   │   └── hermes-agent/  # Hermes Agent source
│   └── assets/            # Icons and resources
├── dist/                  # Built frontend
├── dist-electron/         # Compiled Electron
├── release/               # Built installers
├── package.json           # Dependencies
├── electron-builder.yml   # Build config
└── vite.config.ts         # Vite config
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
- **MSI** - Microsoft Installer

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
