// Type declaration for preload script's contextBridge API.
// Ensures Electron main process and renderer share the same type contract.
import type { ElectronAPI } from '../frontend/types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
