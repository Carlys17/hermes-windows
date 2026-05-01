import { contextBridge, ipcRenderer } from 'electron';

// Local type definition (mirrors src/frontend/types.ts ElectronAPI)
// Not imported from frontend to avoid cross-package rootDir issues in tsconfig.electron.json
interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getSystemInfo: () => Promise<any>;
  getHermesHome: () => Promise<string>;
  getConfig: (key?: string) => Promise<any>;
  setConfig: (key: string, value: any) => Promise<{ success: boolean }>;
  getCredential: (key: string) => Promise<string | null>;
  setCredential: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  deleteCredential: (key: string) => Promise<{ success: boolean }>;
  sendChat: (message: string) => Promise<{ success: boolean; error?: string }>;
  executeCommand: (command: string) => Promise<{ success: boolean; stdout: string; stderr: string; code: number }>;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  getPythonStatus: () => Promise<{ running: boolean; pid: number | null; restartCount: number }>;
  onPythonMessage: (callback: (data: any) => void) => () => void;
  onPythonExit: (callback: (data: any) => void) => () => void;
  onPythonStatus: (callback: (data: any) => void) => () => void;
  onUpdateAvailable: (callback: (data: any) => void) => () => void;
  onUpdateProgress: (callback: (data: any) => void) => () => void;
  onUpdateDownloaded: (callback: (data: any) => void) => () => void;
  checkForUpdate: () => Promise<{ hasUpdate: boolean }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<void>;
  log: (level: string, message: string, meta?: any) => Promise<{ success: boolean }>;
}

const electronAPI: ElectronAPI = {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // Hermes Agent
  getHermesHome: () => ipcRenderer.invoke('hermes:home'),
  getConfig: (key?: string) => ipcRenderer.invoke('hermes:config', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('hermes:config', key, value),

  // Credentials (encrypted)
  getCredential: (key: string) => ipcRenderer.invoke('credentials:get', key),
  setCredential: (key: string, value: string) => ipcRenderer.invoke('credentials:set', key, value),
  deleteCredential: (key: string) => ipcRenderer.invoke('credentials:delete', key),

  // Chat & Commands
  sendChat: (message: string) => ipcRenderer.invoke('hermes:chat', message),
  executeCommand: (command: string) => ipcRenderer.invoke('hermes:command', command),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Python backend
  getPythonStatus: () => ipcRenderer.invoke('python:status'),
  onPythonMessage: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('python:message', handler);
    return () => { ipcRenderer.removeListener('python:message', handler); };
  },
  onPythonExit: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('python:exit', handler);
    return () => { ipcRenderer.removeListener('python:exit', handler); };
  },
  onPythonStatus: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('python:status', handler);
    return () => { ipcRenderer.removeListener('python:status', handler); };
  },

  // Auto-updater
  onUpdateAvailable: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:available', handler);
    return () => { ipcRenderer.removeListener('update:available', handler); };
  },
  onUpdateProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:progress', handler);
    return () => { ipcRenderer.removeListener('update:progress', handler); };
  },
  onUpdateDownloaded: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update:downloaded', handler);
    return () => { ipcRenderer.removeListener('update:downloaded', handler); };
  },
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  // Logging
  log: (level: string, message: string, meta?: any) => ipcRenderer.invoke('log', level, message, meta),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
