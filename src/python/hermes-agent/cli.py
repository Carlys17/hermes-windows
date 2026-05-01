#!/usr/bin/env python3
"""
Hermes Agent Desktop - CLI Command Runner

Executes a single command and exits with the appropriate exit code.
Usage: python cli.py <command> [args...]

Windows-compatible: maps Unix commands to Windows equivalents.
"""

import sys
import os
import platform
import subprocess
import shutil
import json
from datetime import datetime


# Defense-in-depth whitelist (matches Electron main.ts)
ALLOWED_COMMANDS = {
    'hermes', 'hermes-agent',
    'ls', 'cat', 'echo', 'pwd', 'whoami', 'uname', 'df', 'free',
    'ps', 'head', 'tail', 'grep', 'find', 'wc',
}

DANGEROUS_CHARS = set(';&|`$(){}!<>\x00')

# Windows command mappings
WINDOWS_CMD_MAP = {
    'ls': 'dir',
    'cat': 'type',
    'pwd': 'cd',
    'whoami': 'whoami',
    'uname': 'ver',
    'df': 'wmic',
    'free': 'wmic',
    'ps': 'tasklist',
    'head': 'more',
    'tail': 'more',
    'grep': 'findstr',
    'find': 'findstr',
    'wc': 'find /c',
    'echo': 'echo',
}


def resolve_command(bin_name: str) -> tuple:
    """Resolve a command to its Windows equivalent and return (cmd, use_shell)."""
    is_windows = platform.system() == 'Windows'

    if bin_name in ('hermes', 'hermes-agent'):
        return bin_name, False

    if not is_windows:
        # On Linux/macOS, use the command directly
        return bin_name, False

    # Windows: map to Windows equivalents
    win_cmd = WINDOWS_CMD_MAP.get(bin_name)
    if win_cmd:
        # Use shell=True for cmd.exe built-in commands
        shell_cmds = {'dir', 'type', 'cd', 'ver', 'echo', 'more', 'findstr', 'find'}
        return win_cmd, win_cmd in shell_cmds

    # Check if it's a real executable on PATH
    if shutil.which(bin_name):
        return bin_name, False

    return None, False


def run_command(bin_name: str, args: list) -> int:
    """Run a whitelisted command and stream output."""
    try:
        if bin_name in ('hermes', 'hermes-agent'):
            # Hermes-specific commands
            hermes_home = os.environ.get('HERMES_HOME', os.path.expanduser('~/.hermes'))
            if not args or args[0] in ('help', '--help', '-h'):
                print('Hermes Agent CLI')
                print('Usage: hermes <command>')
                print('Commands: help, status, version, config')
                return 0
            elif args[0] == 'status':
                print(f'Hermes Home: {hermes_home}')
                print(f'Platform: {platform.system()} {platform.release()}')
                print(f'Python: {platform.python_version()}')
                return 0
            elif args[0] == 'version':
                print('Hermes Agent Desktop v1.0.0')
                return 0
            else:
                print(f'Unknown hermes command: {args[0]}')
                return 1

        # Resolve to platform-specific command
        cmd, use_shell = resolve_command(bin_name)
        if cmd is None:
            print(f'Command not found: {bin_name}')
            return 127

        if use_shell:
            # For cmd.exe built-ins, use shell=True
            full_cmd = ' '.join([cmd] + args)
            result = subprocess.run(
                full_cmd,
                shell=True,
                capture_output=False,
                timeout=30,
            )
            return result.returncode
        else:
            result = subprocess.run(
                [cmd] + args,
                capture_output=False,
                timeout=30,
            )
            return result.returncode

    except FileNotFoundError:
        print(f'Command not found: {bin_name}')
        return 127
    except subprocess.TimeoutExpired:
        print(f'Command timed out: {bin_name}')
        return 124
    except Exception as e:
        print(f'Error running command: {e}')
        return 1


def main():
    if len(sys.argv) < 2:
        print('Usage: python cli.py <command> [args...]')
        return 1

    bin_name = sys.argv[1]
    args = sys.argv[2:]

    # Validate against whitelist
    base_name = os.path.basename(bin_name).replace('.exe', '').replace('.cmd', '').replace('.bat', '')

    # Defense-in-depth: reject path separators (prevent whitelist bypass)
    if '/' in bin_name or '\\' in bin_name:
        print(f'Path separators not allowed in command: {bin_name}')
        return 1

    if base_name not in ALLOWED_COMMANDS:
        print(f'Command not allowed: {bin_name}')
        print(f'Allowed: {", ".join(sorted(ALLOWED_COMMANDS))}')
        return 1

    # Defense-in-depth: reject dangerous characters in args
    for arg in args:
        if any(c in DANGEROUS_CHARS for c in arg):
            print(f'Dangerous character in argument: {arg[:50]}')
            return 1

    return run_command(base_name, args)


if __name__ == '__main__':
    sys.exit(main() or 0)
