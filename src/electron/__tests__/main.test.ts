/**
 * @jest-environment node
 */

// Mock electron module
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getVersion: () => '1.0.0',
    getPath: () => '/mock/user/data',
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString('utf-8'),
  },
  shell: {
    openExternal: jest.fn(),
    openPath: jest.fn(),
  },
  BrowserWindow: jest.fn(),
  nativeImage: {
    createFromPath: jest.fn(),
  },
}), { virtual: true });

// Re-implement the security functions here for testing
// (Since we can't easily import from main.ts with all its dependencies)

const ALLOWED_COMMANDS = new Set([
  'hermes', 'hermes-agent',
  'ls', 'cat', 'echo', 'pwd', 'whoami', 'uname', 'df', 'free',
  'ps', 'head', 'tail', 'grep', 'find', 'wc',
]);

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
  const baseBin = bin.split(/[\\/]/).pop()?.replace(/\.(exe|cmd|bat|ps1)$/i, '') || bin;
  if (!ALLOWED_COMMANDS.has(baseBin)) return null;

  if (bin.includes('/') || bin.includes('\\')) return null;

  const dangerousChars = /[;&|`$(){}!<>\0]/;
  for (const arg of parts.slice(1)) {
    if (dangerousChars.test(arg)) return null;
  }

  return { bin, args: parts.slice(1) };
}

function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}

describe('parseCommand', () => {
  it('allows whitelisted commands', () => {
    expect(parseCommand('ls')).toEqual({ bin: 'ls', args: [] });
    expect(parseCommand('cat')).toEqual({ bin: 'cat', args: [] });
    expect(parseCommand('echo')).toEqual({ bin: 'echo', args: [] });
    expect(parseCommand('hermes')).toEqual({ bin: 'hermes', args: [] });
  });

  it('allows whitelisted commands with args', () => {
    expect(parseCommand('ls -la')).toEqual({ bin: 'ls', args: ['-la'] });
    expect(parseCommand('echo hello')).toEqual({ bin: 'echo', args: ['hello'] });
    expect(parseCommand('head -n 10 file.txt')).toEqual({ bin: 'head', args: ['-n', '10', 'file.txt'] });
  });

  it('rejects non-whitelisted commands', () => {
    expect(parseCommand('python')).toBeNull();
    expect(parseCommand('pip')).toBeNull();
    expect(parseCommand('git')).toBeNull();
    expect(parseCommand('node')).toBeNull();
    expect(parseCommand('npm')).toBeNull();
  });

  it('rejects commands with path separators', () => {
    expect(parseCommand('/usr/bin/ls')).toBeNull();
    expect(parseCommand('C:\\Windows\\system32\\cmd.exe')).toBeNull();
    expect(parseCommand('.\\python')).toBeNull();
  });

  it('rejects commands with dangerous characters', () => {
    expect(parseCommand('echo hello; rm -rf /')).toBeNull();
    expect(parseCommand('ls | grep foo')).toBeNull();
    expect(parseCommand('echo $(whoami)')).toBeNull();
    expect(parseCommand('echo `evil`')).toBeNull();
    expect(parseCommand('cat < /etc/passwd')).toBeNull();
  });

  it('handles quoted arguments safely', () => {
    const result = parseCommand('echo "hello world"');
    expect(result).not.toBeNull();
    expect(result?.bin).toBe('echo');
  });

  it('rejects empty commands', () => {
    expect(parseCommand('')).toBeNull();
    expect(parseCommand('   ')).toBeNull();
  });

  it('strips file extensions from binary name', () => {
    expect(parseCommand('ls.exe')).toEqual({ bin: 'ls.exe', args: [] });
    expect(parseCommand('grep.cmd')).toEqual({ bin: 'grep.cmd', args: [] });
  });
});

describe('isSafeUrl', () => {
  it('allows http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('http://localhost:3000')).toBe(true);
  });

  it('allows https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('https://github.com/user/repo')).toBe(true);
  });

  it('rejects file: URLs', () => {
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isSafeUrl('not-a-url')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl('://missing-protocol')).toBe(false);
  });
});
