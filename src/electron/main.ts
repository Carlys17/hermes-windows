import { app, BrowserWindow, ipcMain, shell, safeStorage, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

// electron-store is CJS — use default import
import ElectronStore from 'electron-store';
const Store = ElectronStore as any;

// ─── Constants ──────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let pythonRestartCount = 0;
const MAX_PYTHON_RESTARTS = 3;
const isDevMode = !app.isPackaged;

const PYTHON_PATH = isDevMode
  ? path.join(__dirname, '..', 'src', 'python')
  : path.join(process.resourcesPath, 'python');

const HERMES_PATH = isDevMode
  ? path.join(__dirname, '..', 'src', 'python', 'hermes-agent')
  : path.join(process.resourcesPath, 'python', 'hermes-agent');

const ICON_PATH = isDevMode
  ? path.join(__dirname, '..', 'src', 'assets', 'icon.png')
  : path.join(process.resourcesPath, 'assets', 'icon.png');

// ─── Store (non-sensitive config only) ──────────────────────────

let store: InstanceType<typeof Store>;
try {
  store = new Store({ name: 'hermes-config' });
} catch {
  // Fallback if store creation fails
  store = new Store({ name: 'hermes-config', cwd: app.getPath('userData') });
}

// ─── Security: command whitelist & validation ───────────────────

const ALLOWED_COMMANDS = new Set([
  'hermes', 'hermes-agent', 'python', 'pip', 'git', 'node', 'npm',
  'ls', 'cat', 'echo', 'pwd', 'whoami', 'uname', 'df', 'free',
  'ps', 'top', 'head', 'tail', 'grep', 'find', 'wc',
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

  const dangerousChars = /[;&|`$(){}!<>]/;
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
      sandbox: false,            // needed for preload to access Node APIs
    },
    ...(icon ? { icon } : {}),
    show: false,                 // show after ready-to-show
    backgroundColor: '#0f172a',  // match dark theme, prevents white flash
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

function getPpythonExe(): string {
  return process.platform === 'win32'
    ? path.join(PYTHON_PATH, 'python.exe')
    : path.join(PYTHON_PATH, 'bin', 'python3');
}

async function initPythonBackend(): Promise<boolean> {
  const pythonExe = getPpythonExe();

  if (!fs.existsSync(pythonExe)) {
    console.error('Python runtime not found:', pythonExe);
    mainWindow?.webContents.send('python:status', { status: 'missing', path: pythonExe });
    return false;
  }

  const hermesScript = path.join(HERMES_PATH, 'run_agent.py');
  if (!fs.existsSync(hermesScript)) {
    console.error('Hermes agent script not found:', hermesScript);
    mainWindow?.webContents.send('python:status', { status: 'missing', path: hermesScript });
    return false;
  }

  try {
    pythonProcess = spawn(pythonExe, [hermesScript], {
      env: {
        ...process.env,
        HERMES_HOME: path.join(app.getPath('userData'), '.hermes'),
        PYTHONPATH: HERMES_PATH,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    pythonProcess.stdout?.on('data', (data) => {
      const message = data.toString();
      mainWindow?.webContents.send('python:message', { type: 'stdout', data: message });
    });

    pythonProcess.stderr?.on('data', (data) => {
      const message = data.toString();
      console.error('Python stderr:', message);
      mainWindow?.webContents.send('python:message', { type: 'stderr', data: message });
    });

    pythonProcess.on('close', (code) => {
      console.log('Python process exited with code:', code);
      mainWindow?.webContents.send('python:exit', { code });
      pythonProcess = null;

      // Auto-restart on crash (not on clean exit)
      if (code !== 0 && code !== null && pythonRestartCount < MAX_PYTHON_RESTARTS) {
        pythonRestartCount++;
        console.log(`Restarting Python backend (attempt ${pythonRestartCount}/${MAX_PYTHON_RESTARTS})...`);
        setTimeout(() => initPythonBackend(), 2000);
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Python process error:', err);
      pythonProcess = null;
    });

    pythonRestartCount = 0;
    return true;
  } catch (error) {
    console.error('Failed to initialize Python:', error);
    return false;
  }
}

function killPythonProcess() {
  if (pythonProcess) {
    // Try graceful shutdown first
    pythonProcess.stdin?.write(JSON.stringify({ type: 'shutdown' }) + '\n');

    // Force kill after 3 seconds if not exited
    const proc = pythonProcess;
    setTimeout(() => {
      try { proc.kill(); } catch {}
    }, 3000);

    pythonProcess = null;
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

// Config (non-sensitive)
ipcMain.handle('hermes:config', (_event, key?: string, value?: any) => {
  if (key && value !== undefined) {
    store.set(`hermes.${key}`, value);
    return { success: true };
  } else if (key) {
    return store.get(`hermes.${key}`);
  }
  return store.get('hermes');
});

// Credentials (encrypted via safeStorage)
ipcMain.handle('credentials:get', (_event, key: string) => {
  const storeKey = `cred.${key}`;
  const stored = store.get(storeKey) as string | undefined;
  if (!stored) return null;

  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'));
    }
    return Buffer.from(stored, 'base64').toString('utf-8');
  } catch (err) {
    console.error('Failed to decrypt credential:', key);
    return null;
  }
});

ipcMain.handle('credentials:set', (_event, key: string, value: string) => {
  try {
    const storeKey = `cred.${key}`;
    if (safeStorage.isEncryptionAvailable()) {
      store.set(storeKey, safeStorage.encryptString(value).toString('base64'));
    } else {
      store.set(storeKey, Buffer.from(value, 'utf-8').toString('base64'));
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to store credential:', key);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('credentials:delete', (_event, key: string) => {
  store.delete(`cred.${key}` as any);
  return { success: true };
});

// Chat
ipcMain.handle('hermes:chat', (_event, message: string) => {
  if (pythonProcess?.stdin) {
    pythonProcess.stdin.write(JSON.stringify({ type: 'chat', message }) + '\n');
    return { success: true };
  }
  return { success: false, error: 'Python backend not running' };
});

// Command execution (whitelisted)
ipcMain.handle('hermes:command', (_event, command: string) => {
  const parsed = parseCommand(command);
  if (!parsed) {
    return {
      success: false, stdout: '', code: -1,
      stderr: `Command rejected: "${command.split(' ')[0]}" not allowed or contains dangerous characters.`,
    };
  }

  return new Promise((resolve) => {
    const pythonExe = getPpythonExe();
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
    proc.on('close', (code) => {
      resolve({ success: code === 0, stdout, stderr, code });
    });
  });
});

// Shell (validated)
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (!isSafeUrl(url)) return { success: false, error: 'Only http/https URLs allowed' };
  await shell.openExternal(url);
  return { success: true };
});

ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  if (!isSafePath(filePath)) return { success: false, error: 'Path not allowed' };
  await shell.openPath(filePath);
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
      console.error('Auto-updater error:', err);
    });

    // Check for updates after 5 seconds
    setTimeout(() => autoUpdater.checkForUpdates(), 5000);
  } catch (err) {
    console.error('Failed to setup auto-updater:', err);
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

ipcMain.handle('update:install', () => {
  try {
    // electron-updater's quitAndInstall
    app.quit();
  } catch {}
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
