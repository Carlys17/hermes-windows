// Global test setup
import '@testing-library/jest-dom';

// Mock scrollIntoView (not implemented in jsdom) — only in browser-like env
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn();
}

// Mock window.electronAPI globally — typed as jest.Mocked so tests can use mockResolvedValueOnce, etc.
const mockElectronAPI = {
  getVersion: jest.fn().mockResolvedValue('1.0.0'),
  getPlatform: jest.fn().mockResolvedValue('win32'),
  getSystemInfo: jest.fn().mockResolvedValue({
    platform: 'win32',
    arch: 'x64',
    cpus: 8,
    cpuModel: 'Mock CPU',
    totalMemory: 16 * 1024 * 1024 * 1024,
    freeMemory: 8 * 1024 * 1024 * 1024,
    uptime: 3600,
    hostname: 'test-host',
    homeDir: '/home/test',
  }),
  getHermesHome: jest.fn().mockResolvedValue('/home/test/.hermes'),
  getConfig: jest.fn().mockResolvedValue({
    model: { default: 'anthropic/claude-sonnet-4', provider: 'anthropic' },
    agent: { max_turns: 90 },
    terminal: { timeout: 180 },
    display: { skin: 'default' },
  }),
  setConfig: jest.fn().mockResolvedValue({ success: true }),
  getCredential: jest.fn().mockResolvedValue(null),
  setCredential: jest.fn().mockResolvedValue({ success: true }),
  deleteCredential: jest.fn().mockResolvedValue({ success: true }),
  sendChat: jest.fn().mockResolvedValue({ success: true }),
  executeCommand: jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '', code: 0 }),
  openExternal: jest.fn().mockResolvedValue({ success: true }),
  openPath: jest.fn().mockResolvedValue({ success: true }),
  minimizeWindow: jest.fn().mockResolvedValue(undefined),
  maximizeWindow: jest.fn().mockResolvedValue(undefined),
  closeWindow: jest.fn().mockResolvedValue(undefined),
  isMaximized: jest.fn().mockResolvedValue(false),
  getPythonStatus: jest.fn().mockResolvedValue({ running: true, pid: 1234, restartCount: 0 }),
  onPythonMessage: jest.fn().mockReturnValue(jest.fn()),
  onPythonExit: jest.fn().mockReturnValue(jest.fn()),
  onPythonStatus: jest.fn().mockReturnValue(jest.fn()),
  onUpdateAvailable: jest.fn().mockReturnValue(jest.fn()),
  onUpdateProgress: jest.fn().mockReturnValue(jest.fn()),
  onUpdateDownloaded: jest.fn().mockReturnValue(jest.fn()),
  checkForUpdate: jest.fn().mockResolvedValue({ hasUpdate: false }),
  downloadUpdate: jest.fn().mockResolvedValue({ success: true }),
  installUpdate: jest.fn().mockResolvedValue(undefined),
  log: jest.fn().mockResolvedValue({ success: true }),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true,
});

// Suppress console errors during tests unless debugging
const isDebug = typeof process !== 'undefined' && process.env.DEBUG;
if (!isDebug) {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
}
