#!/usr/bin/env python3
"""
Hermes Agent Desktop - CLI Command Runner

Executes a single command and exits with the appropriate exit code.
Usage: python cli.py <command> [args...]

When the real Hermes Agent is installed, replace this with the actual CLI.
"""

import sys
import os
import platform
import subprocess
import json
from datetime import datetime


ALLOWED_COMMANDS = {
    'hermes', 'hermes-agent', 'python', 'pip', 'git', 'node', 'npm',
    'ls', 'cat', 'echo', 'pwd', 'whoami', 'uname', 'df', 'free',
    'ps', 'top', 'head', 'tail', 'grep', 'find', 'wc',
}


def run_command(bin_name: str, args: list[str]) -> int:
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

        # For system commands, use subprocess
        result = subprocess.run(
            [bin_name] + args,
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
    if base_name not in ALLOWED_COMMANDS:
        print(f'Command not allowed: {bin_name}')
        print(f'Allowed: {", ".join(sorted(ALLOWED_COMMANDS))}')
        return 1

    return run_command(bin_name, args)


if __name__ == '__main__':
    sys.exit(main() or 0)
