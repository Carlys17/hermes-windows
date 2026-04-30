import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),

  // Hermes Agent
  getHermesHome: () => ipcRenderer.invoke('hermes:home'),
  getConfig: (key?: string) => ipcRenderer.invoke('hermes:config', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('hermes:config', key, value),

  // Chat & Commands
  sendChat: (message: string) => ipcRenderer.invoke('hermes:chat', message),
  executeCommand: (command: string) => ipcRenderer.invoke('hermes:command', command),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),

  // Python backend messages
  onPythonMessage: (callback: (data: any) => void) => {
    ipcRenderer.on('python:message', (_event, data) => callback(data));
  },
  onPythonExit: (callback: (data: any) => void) => {
    ipcRenderer.on('python:exit', (_event, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type declarations for TypeScript
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getHermesHome: () => Promise<string>;
  getConfig: (key?: string) => Promise<any>;
  setConfig: (key: string, value: any) => Promise<{ success: boolean }>;
  sendChat: (message: string) => Promise<{ success: boolean; error?: string }>;
  executeCommand: (command: string) => Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    code: number;
  }>;
  openExternal: (url: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  onPythonMessage: (callback: (data: any) => void) => void;
  onPythonExit: (callback: (data: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
