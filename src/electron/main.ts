import { app, BrowserWindow, ipcMain, shell, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import Store from 'electron-store';

// Initialize store for settings (non-sensitive only)
const store = new Store();

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let isDevMode = !app.isPackaged;

// Python runtime paths
const PYTHON_PATH = isDevMode
  ? path.join(__dirname, '..', 'src', 'python')
  : path.join(process.resourcesPath, 'python');

const HERMES_PATH = isDevMode
  ? path.join(__dirname, '..', 'src', 'python', 'hermes-agent')
  : path.join(process.resourcesPath, 'python', 'hermes-agent');

// --- Allowed command whitelist for hermes:command ---
const ALLOWED_COMMANDS = new Set([
  'hermes', 'hermes-agent', 'python', 'pip', 'git', 'node', 'npm',
  'ls', 'cat', 'echo', 'pwd', 'whoami', 'uname', 'df', 'free',
  'ps', 'top', 'head', 'tail', 'grep', 'find', 'wc',
]);

// --- URL scheme validation ---
function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}

// --- Path validation (no traversal) ---
function isSafePath(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  // Block path traversal and system directories
  if (normalized.includes('..')) return false;
  if (process.platform === 'win32') {
    // Block access to Windows system dirs
    const sysRoot = process.env.SYSTEMROOT || 'C:\\Windows';
    if (normalized.toLowerCase().startsWith(sysRoot.toLowerCase())) return false;
  }
  return true;
}

// --- Proper command parsing (no shell injection) ---
function parseCommand(command: string): { bin: string; args: string[] } | null {
  // Split respecting quoted strings
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current.length > 0) {
        parts.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) parts.push(current);

  if (parts.length === 0) return null;

  // Validate first token against whitelist
  const bin = parts[0];
  const baseBin = path.basename(bin).replace(/\.(exe|cmd|bat|ps1)$/i, '');
  if (!ALLOWED_COMMANDS.has(baseBin)) {
    return null; // Reject unknown commands
  }

  // Sanitize args: reject anything containing shell metacharacters
  const dangerousChars = /[;&|`$(){}!<>]/;
  for (const arg of parts.slice(1)) {
    if (dangerousChars.test(arg)) return null;
  }

  return { bin, args: parts.slice(1) };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'src', 'assets', 'icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Load the frontend
  if (isDevMode) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize Python backend
async function initPythonBackend() {
  try {
    const pythonExe = process.platform === 'win32'
      ? path.join(PYTHON_PATH, 'python.exe')
      : path.join(PYTHON_PATH, 'bin', 'python3');

    if (!fs.existsSync(pythonExe)) {
      console.error('Python runtime not found:', pythonExe);
      return false;
    }

    const hermesScript = path.join(HERMES_PATH, 'run_agent.py');
    if (!fs.existsSync(hermesScript)) {
      console.error('Hermes agent script not found:', hermesScript);
      return false;
    }

    pythonProcess = spawn(pythonExe, [hermesScript], {
      env: {
        ...process.env,
        HERMES_HOME: path.join(app.getPath('userData'), '.hermes'),
        PYTHONPATH: HERMES_PATH,
      },
    });

    pythonProcess.stdout?.on('data', (data) => {
      const message = data.toString();
      console.log('Python stdout:', message);
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
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Python:', error);
    return false;
  }
}

// ─── IPC Handlers ───────────────────────────────────────────────

ipcMain.handle('app:version', () => {
  return app.getVersion();
});

ipcMain.handle('app:platform', () => {
  return process.platform;
});

ipcMain.handle('hermes:home', () => {
  return path.join(app.getPath('userData'), '.hermes');
});

// --- System info ---
ipcMain.handle('system:info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
    hostname: os.hostname(),
    homeDir: os.homedir(),
  };
});

// --- Config (non-sensitive data only) ---
ipcMain.handle('hermes:config', async (_event, key?: string, value?: any) => {
  if (key && value !== undefined) {
    store.set(`hermes.${key}`, value);
    return { success: true };
  } else if (key) {
    return store.get(`hermes.${key}`);
  }
  return store.get('hermes');
});

// --- Credential storage via safeStorage ---
ipcMain.handle('credentials:get', async (_event, key: string) => {
  const storeKey = `cred.${key}`;
  const encrypted = store.get(storeKey) as string | undefined;
  if (!encrypted) return null;

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encrypted, 'base64');
      return safeStorage.decryptString(buffer);
    }
    // Fallback: base64-encoded (not encrypted, but at least not plain visible)
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  } catch (err) {
    console.error('Failed to decrypt credential:', key, err);
    return null;
  }
});

ipcMain.handle('credentials:set', async (_event, key: string, value: string) => {
  try {
    const storeKey = `cred.${key}`;
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value);
      store.set(storeKey, encrypted.toString('base64'));
    } else {
      // Fallback: base64 encode
      store.set(storeKey, Buffer.from(value, 'utf-8').toString('base64'));
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to store credential:', key, err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('credentials:delete', async (_event, key: string) => {
  store.delete(`cred.${key}` as any);
  return { success: true };
});

// --- Chat (send to Python backend) ---
ipcMain.handle('hermes:chat', async (_event, message: string) => {
  if (pythonProcess && pythonProcess.stdin) {
    pythonProcess.stdin.write(JSON.stringify({ type: 'chat', message }) + '\n');
    return { success: true };
  }
  return { success: false, error: 'Python backend not running' };
});

// --- Command execution (WHITELISTED only) ---
ipcMain.handle('hermes:command', async (_event, command: string) => {
  const parsed = parseCommand(command);
  if (!parsed) {
    return {
      success: false,
      stdout: '',
      stderr: `Command rejected: "${command.split(' ')[0]}" is not in the allowed command list or contains dangerous characters.`,
      code: -1,
    };
  }

  return new Promise((resolve) => {
    const pythonExe = process.platform === 'win32'
      ? path.join(PYTHON_PATH, 'python.exe')
      : path.join(PYTHON_PATH, 'bin', 'python3');

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

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        code,
      });
    });
  });
});

// --- Shell: open external URL (VALIDATED) ---
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (!isSafeUrl(url)) {
    console.warn('Blocked unsafe URL:', url);
    return { success: false, error: 'Only http/https URLs are allowed' };
  }
  await shell.openExternal(url);
  return { success: true };
});

// --- Shell: open path (VALIDATED) ---
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  if (!isSafePath(filePath)) {
    console.warn('Blocked unsafe path:', filePath);
    return { success: false, error: 'Path not allowed' };
  }
  await shell.openPath(filePath);
  return { success: true };
});

// --- Window controls ---
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// ─── App lifecycle ──────────────────────────────────────────────

app.whenReady().then(async () => {
  createWindow();

  // Initialize Python backend
  await initPythonBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill Python process
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill Python process
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
});
