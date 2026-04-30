#!/usr/bin/env python3
"""
Hermes Agent Desktop - Backend Agent Runner

This script runs as a long-lived process, receiving JSON messages on stdin
and sending responses to stdout. Communication protocol:

  Input (stdin):  {"type": "chat", "message": "user message"}\n
  Output (stdout): {"type": "response", "content": "..."}\n

When the real Hermes Agent is installed, replace this stub with the actual
hermes-agent entry point.
"""

import sys
import json
import os
import platform
import subprocess
import traceback
from datetime import datetime


def get_hermes_home():
    """Get the Hermes home directory."""
    return os.environ.get('HERMES_HOME', os.path.expanduser('~/.hermes'))


def handle_chat(message: str) -> dict:
    """Handle a chat message from the frontend."""
    # Try to use the real Hermes Agent if available
    hermes_home = get_hermes_home()
    config_path = os.path.join(hermes_home, 'config.yaml')

    # Basic responses for when the real agent isn't available
    msg_lower = message.lower().strip()

    if msg_lower in ('help', 'what can you do?', '/help'):
        return {
            'type': 'response',
            'content': (
                'Hermes Agent Desktop v1.0.0\n\n'
                'Available commands:\n'
                '  help          - Show this help\n'
                '  status        - Show system status\n'
                '  config        - Show configuration path\n'
                '  version       - Show version info\n\n'
                'For full AI capabilities, install Hermes Agent:\n'
                '  pip install hermes-agent\n'
                'Or run: setup-python.bat'
            )
        }

    if msg_lower in ('status', 'system status', '/status'):
        return {
            'type': 'response',
            'content': (
                f'System Status:\n'
                f'  Platform: {platform.system()} {platform.release()}\n'
                f'  Python: {platform.python_version()}\n'
                f'  Architecture: {platform.machine()}\n'
                f'  Hermes Home: {hermes_home}\n'
                f'  Config: {"exists" if os.path.exists(config_path) else "not found"}\n'
                f'  Time: {datetime.now().isoformat()}'
            )
        }

    if msg_lower in ('config', '/config'):
        return {
            'type': 'response',
            'content': f'Configuration path: {config_path}\nHermes Home: {hermes_home}'
        }

    if msg_lower in ('version', '/version'):
        return {
            'type': 'response',
            'content': (
                'Hermes Agent Desktop v1.0.0\n'
                f'Python {platform.python_version()}\n'
                f'Platform: {platform.system()} {platform.release()}'
            )
        }

    # Default: echo back with a note
    return {
        'type': 'response',
        'content': (
            f'[Hermes Agent Stub] Received: {message}\n\n'
            'The full Hermes Agent backend is not yet installed.\n'
            'Run setup-python.bat to install the complete AI backend,\n'
            'or use the Settings page to configure your API keys.'
        )
    }


def main():
    """Main loop: read JSON messages from stdin, write responses to stdout."""
    # Signal that we're ready
    print(json.dumps({
        'type': 'status',
        'content': 'Hermes Agent backend started',
        'timestamp': datetime.now().isoformat()
    }), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            data = json.loads(line)
            msg_type = data.get('type', '')

            if msg_type == 'chat':
                response = handle_chat(data.get('message', ''))
                print(json.dumps(response), flush=True)
            else:
                print(json.dumps({
                    'type': 'error',
                    'content': f'Unknown message type: {msg_type}'
                }), flush=True)

        except json.JSONDecodeError:
            print(json.dumps({
                'type': 'error',
                'content': f'Invalid JSON: {line[:100]}'
            }), flush=True)
        except Exception as e:
            print(json.dumps({
                'type': 'error',
                'content': f'Error: {str(e)}',
                'traceback': traceback.format_exc()
            }), flush=True)


if __name__ == '__main__':
    main()
