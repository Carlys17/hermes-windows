// Shared types for Hermes Agent Desktop
// Used by both Electron main process and React renderer

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
  // App info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getSystemInfo: () => Promise<SystemInfo>;

  // Hermes Agent
  getHermesHome: () => Promise<string>;
  getConfig: (key?: string) => Promise<any>;
  setConfig: (key: string, value: any) => Promise<{ success: boolean }>;

  // Credentials (encrypted)
  getCredential: (key: string) => Promise<string | null>;
  setCredential: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  deleteCredential: (key: string) => Promise<{ success: boolean }>;

  // Chat & Commands
  sendChat: (message: string) => Promise<{ success: boolean; error?: string }>;
  executeCommand: (command: string) => Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    code: number;
  }>;

  // Shell
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  openPath: (path: string) => Promise<{ success: boolean; error?: string }>;

  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // Python backend
  getPythonStatus: () => Promise<{ running: boolean; pid: number | null; restartCount: number }>;
  onPythonMessage: (callback: (data: { type: string; data: string }) => void) => () => void;
  onPythonExit: (callback: (data: { code: number }) => void) => () => void;
  onPythonStatus: (callback: (data: { status: string; path?: string }) => void) => () => void;

  // Logging
  log: (level: string, message: string, meta?: any) => Promise<{ success: boolean }>;

  // Auto-updater
  onUpdateAvailable: (callback: (data: { version: string; releaseDate: string }) => void) => () => void;
  onUpdateProgress: (callback: (data: { percent: number; transferred: number; total: number }) => void) => () => void;
  onUpdateDownloaded: (callback: (data: { version: string }) => void) => () => void;
  checkForUpdate: () => Promise<{ hasUpdate: boolean }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
