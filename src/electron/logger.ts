// Simple structured file logger for Electron main process.
// Writes to %APPDATA%/hermes-config/logs/main.log with rotation.
import * as fs from 'fs';
import * as path from 'path';

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

let logDir: string;
let logStream: fs.WriteStream | null = null;

function getLogDir(): string {
  if (!logDir) {
    const { app } = require('electron');
    logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  return logDir;
}

function getLogPath(index = 0): string {
  const dir = getLogDir();
  return index === 0
    ? path.join(dir, 'main.log')
    : path.join(dir, `main.log.${index}`);
}

function rotateIfNeeded(): void {
  const logPath = getLogPath(0);
  try {
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > MAX_LOG_SIZE) {
        // Shift existing rotated files
        for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
          const src = getLogPath(i - 1);
          const dst = getLogPath(i);
          if (fs.existsSync(src)) {
            fs.renameSync(src, dst);
          }
        }
        // Delete oldest if over limit
        const oldest = getLogPath(MAX_LOG_FILES);
        if (fs.existsSync(oldest)) {
          fs.unlinkSync(oldest);
        }
        // Close existing stream
        if (logStream) {
          logStream.end();
          logStream = null;
        }
      }
    }
  } catch {
    // Rotation failure is non-critical
  }
}

function getStream(): fs.WriteStream {
  if (!logStream) {
    rotateIfNeeded();
    const logPath = getLogPath(0);
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.on('error', () => {
      logStream = null; // Reset on error, will retry next write
    });
  }
  return logStream;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLine(level: string, message: string, meta?: any): string {
  const line = `[${formatTimestamp()}] [${level.toUpperCase()}] ${message}`;
  return meta ? `${line} ${JSON.stringify(meta)}` : line;
}

function write(level: string, message: string, meta?: any): void {
  const line = formatLine(level, message, meta) + '\n';
  // Always write to console
  const consoleFn = level === 'error' ? console.error :
    level === 'warn' ? console.warn : console.log;
  consoleFn(line.trim());

  // Also write to file
  try {
    getStream().write(line);
  } catch {
    // Log file write failure — already logged to console
  }
}

export const logger = {
  info(message: string, meta?: any) {
    write('info', message, meta);
  },
  warn(message: string, meta?: any) {
    write('warn', message, meta);
  },
  error(message: string, meta?: any) {
    write('error', message, meta);
  },
  debug(message: string, meta?: any) {
    write('debug', message, meta);
  },
  flush(): void {
    if (logStream) {
      logStream.end();
      logStream = null;
    }
  },
};
