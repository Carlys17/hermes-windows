import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import Store from 'electron-store';

// Initialize store for settings
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
    // Check if Python is bundled
    const pythonExe = process.platform === 'win32'
      ? path.join(PYTHON_PATH, 'python.exe')
      : path.join(PYTHON_PATH, 'bin', 'python3');

    if (!fs.existsSync(pythonExe)) {
      console.error('Python runtime not found:', pythonExe);
      return false;
    }

    // Start Hermes Agent backend
    const hermesScript = path.join(HERMES_PATH, 'run_agent.py');

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

// IPC Handlers
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

ipcMain.handle('app:platform', () => {
  return process.platform;
});

ipcMain.handle('hermes:home', () => {
  return path.join(app.getPath('userData'), '.hermes');
});

ipcMain.handle('hermes:config', async (_event, key?: string, value?: any) => {
  if (key && value !== undefined) {
    store.set(`hermes.${key}`, value);
    return { success: true };
  } else if (key) {
    return store.get(`hermes.${key}`);
  }
  return store.get('hermes');
});

ipcMain.handle('hermes:chat', async (_event, message: string) => {
  // Send message to Python backend
  if (pythonProcess && pythonProcess.stdin) {
    pythonProcess.stdin.write(JSON.stringify({ type: 'chat', message }) + '\n');
    return { success: true };
  }
  return { success: false, error: 'Python backend not running' };
});

ipcMain.handle('hermes:command', async (_event, command: string) => {
  // Execute hermes CLI command
  return new Promise((resolve) => {
    const pythonExe = process.platform === 'win32'
      ? path.join(PYTHON_PATH, 'python.exe')
      : path.join(PYTHON_PATH, 'bin', 'python3');

    const hermesCli = path.join(HERMES_PATH, 'cli.py');

    const proc = spawn(pythonExe, [hermesCli, ...command.split(' ')], {
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

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  await shell.openPath(filePath);
});

// App lifecycle
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
