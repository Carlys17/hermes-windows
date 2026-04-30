import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // Hermes Agent
  getHermesHome: () => ipcRenderer.invoke('hermes:home'),
  getConfig: (key?: string) => ipcRenderer.invoke('hermes:config', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('hermes:config', key, value),

  // Credentials (encrypted storage)
  getCredential: (key: string) => ipcRenderer.invoke('credentials:get', key),
  setCredential: (key: string, value: string) => ipcRenderer.invoke('credentials:set', key, value),
  deleteCredential: (key: string) => ipcRenderer.invoke('credentials:delete', key),

  // Chat & Commands
  sendChat: (message: string) => ipcRenderer.invoke('hermes:chat', message),
  executeCommand: (command: string) => ipcRenderer.invoke('hermes:command', command),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Python backend messages (with proper cleanup)
  onPythonMessage: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('python:message', handler);
    return () => ipcRenderer.removeListener('python:message', handler);
  },
  onPythonExit: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('python:exit', handler);
    return () => ipcRenderer.removeListener('python:exit', handler);
  },
});

// Type declarations for TypeScript
export interface SystemInfo {
  platform: string;
  arch: string;
  cpus: number;
  cpuModel: string;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  hostname: string;
  homeDir: string;
}

export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getSystemInfo: () => Promise<SystemInfo>;
  getHermesHome: () => Promise<string>;
  getConfig: (key?: string) => Promise<any>;
  setConfig: (key: string, value: any) => Promise<{ success: boolean }>;
  getCredential: (key: string) => Promise<string | null>;
  setCredential: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  deleteCredential: (key: string) => Promise<{ success: boolean }>;
  sendChat: (message: string) => Promise<{ success: boolean; error?: string }>;
  executeCommand: (command: string) => Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    code: number;
  }>;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  onPythonMessage: (callback: (data: any) => void) => () => void;
  onPythonExit: (callback: (data: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
