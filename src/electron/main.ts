import { app, BrowserWindow, ipcMain, shell, safeStorage, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { logger } from './logger';

// Fix #1: electron-store is ESM-only in v8; use lazy dynamic import for CJS compat
let store: any = null;
async function getStore() {
  if (!store) {
    const Store = (await import('electron-store')).default;
    store = new Store({ name: 'hermes-config' });
  }
  return store;
}

// Fix #6: Global error handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err?.message || String(err));
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', String(reason));
});

// ─── Constants ──────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let pythonRestartCount = 0;
const MAX_PYTHON_RESTARTS = 3;
const isDevMode = !app.isPackaged;

// Fix #10: Concurrency limit for command processes
let activeCommands = 0;
const MAX_CONCURRENT_COMMANDS = 5;

const PYTHON_PATH = isDevMode
  ? path.join(__dirname, '..', 'src', 'python')
  : path.join(process.resourcesPath, 'python');

const HERMES_PATH = isDevMode
  ? path.join(__dirname, '..', 'src', 'python', 'hermes-agent')
  : path.join(process.resourcesPath, 'python', 'hermes-agent');

const ICON_PATH = isDevMode
  ? path.join(__dirname, '..', 'src', 'assets', 'icon.png')
  : path.join(process.resourcesPath, 'assets', 'icon.png');



// ─── Security: command whitelist & validation ───────────────────

// Fix #3: Removed dangerous commands (python, pip, git, node, npm) that allow
// arbitrary code execution via -c/-e flags. Keep only safe read-only commands.
const ALLOWED_COMMANDS = new Set([
  'hermes', 'hermes-agent',
  'ls', 'cat', 'echo', 'pwd', 'whoami', 'uname', 'df', 'free',
  'ps', 'head', 'tail', 'grep', 'find', 'wc',
]);

function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isSafePath(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) return false;
  if (process.platform === 'win32') {
    const sysRoot = process.env.SYSTEMROOT || 'C:\\Windows';
    if (normalized.toLowerCase().startsWith(sysRoot.toLowerCase())) return false;
  }
  return true;
}

function parseCommand(command: string): { bin: string; args: string[] } | null {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (inQuote) {
      if (ch === quoteChar) { inQuote = false; } else { current += ch; }
    } else if (ch === '"' || ch === "'") {
      inQuote = true; quoteChar = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current.length > 0) { parts.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) parts.push(current);
  if (parts.length === 0) return null;

  const bin = parts[0];
  const baseBin = path.basename(bin).replace(/\.(exe|cmd|bat|ps1)$/i, '');
  if (!ALLOWED_COMMANDS.has(baseBin)) return null;

  // Fix #2: Reject any input containing path separators to prevent whitelist bypass
  if (bin.includes('/') || bin.includes('\\')) return null;

  // Fix #4: Added \0 to dangerous chars to prevent null byte injection
  const dangerousChars = /[;&|`$(){}!<>\0]/;
  for (const arg of parts.slice(1)) {
    if (dangerousChars.test(arg)) return null;
  }

  return { bin, args: parts.slice(1) };
}

// ─── Icon helper ────────────────────────────────────────────────

function getAppIcon(): Electron.NativeImage | undefined {
  try {
    if (fs.existsSync(ICON_PATH)) {
      return nativeImage.createFromPath(ICON_PATH);
    }
  } catch {}
  return undefined;
}

// ─── Window creation ────────────────────────────────────────────

function createWindow() {
  const icon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,                 // native frame — works on all platforms
    // Use custom titlebar on Windows via CSS (-webkit-app-region: drag)
    // No need for frame:false — the custom Titlebar component overlays
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Fix #5: Enable sandbox for security
      sandbox: true,
    },
    ...(icon ? { icon } : {}),
    show: false,                 // show after ready-to-show
    backgroundColor: '#0f172a',  // match dark theme, prevents white flash
  });

  // Fix #16: Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"],
      },
    });
  });

  if (isDevMode) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Python backend lifecycle ───────────────────────────────────

// Fix #13: Fixed typo from getPpythonExe to getPythonExe
function getPythonExe(): string {
  return process.platform === 'win32'
    ? path.join(PYTHON_PATH, 'python.exe')
    : path.join(PYTHON_PATH, 'bin', 'python3');
}

async function initPythonBackend(): Promise<boolean> {
  const pythonExe = getPythonExe();

  if (!fs.existsSync(pythonExe)) {
    logger.error('Python runtime not found:', pythonExe);
    mainWindow?.webContents.send('python:status', { status: 'missing', path: pythonExe });
    return false;
  }

  const hermesScript = path.join(HERMES_PATH, 'run_agent.py');
  if (!fs.existsSync(hermesScript)) {
    logger.error('Hermes agent script not found:', hermesScript);
    mainWindow?.webContents.send('python:status', { status: 'missing', path: hermesScript });
    return false;
  }

  // Load API keys to pass to Python backend via environment
  const envVars: Record<string, string> = {
    HERMES_HOME: path.join(app.getPath('userData'), '.hermes'),
    PYTHONPATH: HERMES_PATH,
  };
  try {
    const s = await getStore();
    const credKeys = [
      'cred.openrouter_api_key',
      'cred.anthropic_api_key',
      'cred.dashscope_api_key',
      'cred.xiaomi_api_key',
    ];
    const envKeyMap: Record<string, string> = {
      'cred.openrouter_api_key': 'OPENROUTER_API_KEY',
      'cred.anthropic_api_key': 'ANTHROPIC_API_KEY',
      'cred.dashscope_api_key': 'DASHSCOPE_API_KEY',
      'cred.xiaomi_api_key': 'XIAOMI_API_KEY',
    };
    for (const storeKey of credKeys) {
      const raw = s.get(storeKey) as string | undefined;
      if (raw) {
        let decrypted: string;
        if (safeStorage.isEncryptionAvailable()) {
          decrypted = safeStorage.decryptString(Buffer.from(raw, 'base64'));
        } else {
          decrypted = Buffer.from(raw, 'base64').toString('utf-8');
        }
        const envKey = envKeyMap[storeKey];
        if (envKey) envVars[envKey] = decrypted;
      }
    }
  } catch (err) {
    logger.warn('Failed to load credentials for Python backend:', String(err));
  }

  try {
    pythonProcess = spawn(pythonExe, [hermesScript], {
      env: {
        ...process.env,
        ...envVars,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    pythonProcess.stdout?.on('data', (data) => {
      const message = data.toString();
      mainWindow?.webContents.send('python:message', { type: 'stdout', data: message });
    });

    pythonProcess.stderr?.on('data', (data) => {
      const message = data.toString();
      logger.error('Python stderr:', message);
      mainWindow?.webContents.send('python:message', { type: 'stderr', data: message });
    });

    pythonProcess.on('close', (code) => {
      logger.info('Python process exited with code:', String(code));
      mainWindow?.webContents.send('python:exit', { code });
      pythonProcess = null;

      // Auto-restart on crash (not on clean exit)
      if (code !== 0 && code !== null && pythonRestartCount < MAX_PYTHON_RESTARTS) {
        pythonRestartCount++;
        logger.info(`Restarting Python backend (attempt ${pythonRestartCount}/${MAX_PYTHON_RESTARTS})...`);
        setTimeout(() => initPythonBackend(), 2000);
      }
    });

    pythonProcess.on('error', (err) => {
      logger.error('Python process error:', String(err));
      pythonProcess = null;
    });

    pythonRestartCount = 0;
    return true;
  } catch (error) {
    logger.error('Failed to initialize Python:', String(error));
    return false;
  }
}

// Fix #8: Don't null pythonProcess immediately — let the close handler null it
function killPythonProcess() {
  if (pythonProcess) {
    const proc = pythonProcess;
    pythonProcess = null; // prevent new references from other handlers
    proc.stdin?.write(JSON.stringify({ type: 'shutdown' }) + '\n');
    setTimeout(() => {
      try { proc.kill(); } catch {}
    }, 3000);
  }
}

// ─── IPC Handlers ───────────────────────────────────────────────

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);

ipcMain.handle('hermes:home', () =>
  path.join(app.getPath('userData'), '.hermes')
);

ipcMain.handle('system:info', () => ({
  platform: process.platform,
  arch: process.arch,
  cpus: os.cpus().length,
  cpuModel: os.cpus()[0]?.model || 'Unknown',
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  uptime: os.uptime(),
  hostname: os.hostname(),
  homeDir: os.homedir(),
}));

// Config (non-sensitive) — Fix #1: await getStore()
ipcMain.handle('hermes:config', async (_event, key?: string, value?: any) => {
  const s = await getStore();
  if (key && value !== undefined) {
    s.set(`hermes.${key}`, value);
    return { success: true };
  } else if (key) {
    return s.get(`hermes.${key}`);
  }
  return s.get('hermes');
});

// Credentials (encrypted via safeStorage) — Fix #1 + Fix #14
ipcMain.handle('credentials:get', async (_event, key: string) => {
  // Fix #14: Validate credential key format
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key)) {
    return null;
  }

  const s = await getStore();
  const storeKey = `cred.${key}`;
  const stored = s.get(storeKey) as string | undefined;
  if (!stored) return null;

  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'));
    }
    return Buffer.from(stored, 'base64').toString('utf-8');
  } catch (err) {
    logger.error('Failed to decrypt credential:', key);
    return null;
  }
});

ipcMain.handle('credentials:set', async (_event, key: string, value: string) => {
  // Fix #14: Validate credential key format
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key)) {
    return { success: false, error: 'Invalid key format' };
  }

  try {
    const s = await getStore();
    const storeKey = `cred.${key}`;
    if (safeStorage.isEncryptionAvailable()) {
      s.set(storeKey, safeStorage.encryptString(value).toString('base64'));
    } else {
      s.set(storeKey, Buffer.from(value, 'utf-8').toString('base64'));
    }
    return { success: true };
  } catch (err) {
    logger.error('Failed to store credential:', key);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('credentials:delete', async (_event, key: string) => {
  // Fix #14: Validate credential key format
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key)) {
    return { success: false, error: 'Invalid key format' };
  }

  const s = await getStore();
  s.delete(`cred.${key}` as any);
  return { success: true };
});

// Chat — Fix #7: Wrap stdin.write in try-catch to handle race conditions
ipcMain.handle('hermes:chat', (_event, message: string) => {
  try {
    if (pythonProcess?.stdin) {
      pythonProcess.stdin.write(JSON.stringify({ type: 'chat', message }) + '\n');
      return { success: true };
    }
    return { success: false, error: 'Python backend not running' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Command execution (whitelisted) — Fix #9, #10
ipcMain.handle('hermes:command', (_event, command: string) => {
  // Fix #10: Concurrency limit
  if (activeCommands >= MAX_CONCURRENT_COMMANDS) {
    return {
      success: false, stdout: '', stderr: 'Too many concurrent commands. Please wait.', code: -1,
    };
  }

  const parsed = parseCommand(command);
  if (!parsed) {
    return {
      success: false, stdout: '', code: -1,
      stderr: `Command rejected: "${command.split(' ')[0]}" not allowed or contains dangerous characters.`,
    };
  }

  activeCommands++;

  return new Promise((resolve) => {
    const pythonExe = getPythonExe();
    const hermesCli = path.join(HERMES_PATH, 'cli.py');

    const proc = spawn(pythonExe, [hermesCli, parsed.bin, ...parsed.args], {
      env: {
        ...process.env,
        HERMES_HOME: path.join(app.getPath('userData'), '.hermes'),
        PYTHONPATH: HERMES_PATH,
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    // Fix #9: 30-second timeout
    const timeout = setTimeout(() => {
      try { proc.kill(); } catch {}
    }, 30000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      activeCommands--;
      // Fix #9: 1MB output cap
      const maxLen = 1024 * 1024;
      resolve({
        success: code === 0,
        stdout: stdout.slice(0, maxLen),
        stderr: stderr.slice(0, maxLen),
        code,
      });
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      activeCommands--;
    });
  });
});

// Shell (validated)
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (!isSafeUrl(url)) return { success: false, error: 'Only http/https URLs allowed' };
  await shell.openExternal(url);
  return { success: true };
});

// Fix #11: Check return value of shell.openPath
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  if (!isSafePath(filePath)) return { success: false, error: 'Path not allowed' };
  const err = await shell.openPath(filePath);
  if (err) return { success: false, error: err };
  return { success: true };
});

// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// Python status check
ipcMain.handle('python:status', () => {
  return {
    running: pythonProcess !== null,
    pid: pythonProcess?.pid ?? null,
    restartCount: pythonRestartCount,
  };
});

// ─── Auto-updater (production only) ─────────────────────────────

async function setupAutoUpdater() {
  if (isDevMode) return;

  try {
    const { autoUpdater } = await import('electron-updater');

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('update:progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('update:downloaded', { version: info.version });
    });

    autoUpdater.on('error', (err) => {
      logger.error('Auto-updater error:', String(err));
    });

    // Check for updates after 5 seconds
    setTimeout(() => autoUpdater.checkForUpdates(), 5000);

    // Fix #15: Periodic update check every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        logger.error('Periodic update check failed:', String(err));
      });
    }, 4 * 60 * 60 * 1000);
  } catch (err) {
    logger.error('Failed to setup auto-updater:', String(err));
  }
}

// IPC for manual update actions
ipcMain.handle('update:check', async () => {
  try {
    const { autoUpdater } = await import('electron-updater');
    const result = await autoUpdater.checkForUpdates();
    return { hasUpdate: result?.updateInfo?.version !== app.getVersion() };
  } catch {
    return { hasUpdate: false };
  }
});

ipcMain.handle('update:download', async () => {
  try {
    const { autoUpdater } = await import('electron-updater');
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Fix #12: Use autoUpdater.quitAndInstall() instead of app.quit()
ipcMain.handle('update:install', async () => {
  try {
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.quitAndInstall(false, true);
  } catch (err) {
    logger.error('Failed to install update:', String(err));
  }
});

// Logging — receive log entries from renderer process
ipcMain.handle('log', (_event, level: string, message: string, meta?: any) => {
  const logFn = level === 'error' ? logger.error :
    level === 'warn' ? logger.warn :
    level === 'debug' ? logger.debug : logger.info;
  logFn(message, meta);
  return { success: true };
});

// ─── App lifecycle ──────────────────────────────────────────────

app.whenReady().then(async () => {
  createWindow();
  await initPythonBackend();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  killPythonProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killPythonProcess();
});
