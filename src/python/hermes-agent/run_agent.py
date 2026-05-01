#!/usr/bin/env python3
"""
Hermes Agent Desktop - Backend Agent Runner

Runs as a long-lived process, receiving JSON messages on stdin
and sending responses to stdout. Communication protocol:

  Input (stdin):  {"type": "chat", "message": "user message"}\n
  Output (stdout): {"type": "response", "content": "..."}\n

Supports real AI provider calls (Anthropic, OpenAI, OpenRouter,
DashScope, Xiaomi) when API keys are configured.
"""

import sys
import json
import os
import platform
import traceback
from datetime import datetime


# ─── Provider configs ───────────────────────────────────────────

PROVIDERS = {
    'anthropic': {
        'name': 'Anthropic',
        'base_url': 'https://api.anthropic.com/v1/messages',
        'header': 'x-api-key',
        'model_path': 'model',
    },
    'openai': {
        'name': 'OpenAI',
        'base_url': 'https://api.openai.com/v1/chat/completions',
        'header': 'Authorization',
        'model_path': 'model',
    },
    'openrouter': {
        'name': 'OpenRouter',
        'base_url': 'https://openrouter.ai/api/v1/chat/completions',
        'header': 'Authorization',
        'model_path': 'model',
    },
    'alibaba-dashscope': {
        'name': 'Alibaba DashScope',
        'base_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        'header': 'Authorization',
        'model_path': 'model',
    },
    'xiaomi': {
        'name': 'Xiaomi MiMo',
        'base_url': 'https://api.mimispace.com/v1/chat/completions',
        'header': 'Authorization',
        'model_path': 'model',
    },
    'deepseek': {
        'name': 'DeepSeek',
        'base_url': 'https://api.deepseek.com/chat/completions',
        'header': 'Authorization',
        'model_path': 'model',
    },
    'google': {
        'name': 'Google',
        'base_url': 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        'header': 'Authorization',
        'model_path': 'model',
    },
}


def get_hermes_home():
    """Get the Hermes home directory."""
    return os.environ.get('HERMES_HOME', os.path.expanduser('~/.hermes'))


def load_config():
    """Load Hermes config from yaml or JSON file."""
    hermes_home = get_hermes_home()
    # Try JSON first (simpler, no pyyaml dep required)
    config_path = os.path.join(hermes_home, 'config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    # Try YAML
    yaml_path = os.path.join(hermes_home, 'config.yaml')
    if os.path.exists(yaml_path):
        try:
            import yaml
            with open(yaml_path, 'r') as f:
                return yaml.safe_load(f)
        except ImportError:
            pass
        except Exception:
            pass
    return {}


def load_credentials():
    """Load API credentials from electron-store exported JSON."""
    hermes_home = get_hermes_home()
    cred_path = os.path.join(hermes_home, 'credentials.json')
    if os.path.exists(cred_path):
        try:
            with open(cred_path, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    # Also check environment variables as fallback
    creds = {}
    for key in ['OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'DASHSCOPE_API_KEY', 'XIAOMI_API_KEY',
                 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY']:
        val = os.environ.get(key)
        if val:
            creds[key.lower()] = val
    return creds


def get_provider_for_model(model: str, config: dict) -> str:
    """Determine which provider to use based on model name or explicit config."""
    provider = config.get('model', {}).get('provider', '')

    # If model has a provider prefix, use it
    if '/' in model and not provider:
        prefix = model.split('/')[0]
        for key in PROVIDERS:
            if prefix in key:
                return key

    # Fall back to explicit provider config
    if provider and provider in PROVIDERS:
        return provider

    # Infer from model name patterns
    model_lower = model.lower()
    if 'claude' in model_lower:
        return 'anthropic'
    elif 'gpt' in model_lower or 'o1' in model_lower or 'o3' in model_lower:
        return 'openai'
    elif 'qwen' in model_lower:
        return 'alibaba-dashscope'
    elif 'mimo' in model_lower:
        return 'xiaomi'
    elif 'deepseek' in model_lower:
        return 'deepseek'
    elif 'gemini' in model_lower:
        return 'google'

    # Default: openrouter (supports all models)
    return provider or 'openrouter'


def call_api(provider: str, model: str, api_key: str, messages: list) -> str:
    """Call an AI provider's API and return the response text."""
    provider_config = PROVIDERS.get(provider)
    if not provider_config:
        raise ValueError(f'Unknown provider: {provider}')

    url = provider_config['base_url']

    # Build headers
    headers = {'Content-Type': 'application/json'}
    if provider_config['header'] == 'Authorization':
        headers['Authorization'] = f'Bearer {api_key}'
    else:
        headers[provider_config['header']] = api_key

    # Add OpenRouter-specific headers
    if provider == 'openrouter':
        headers['HTTP-Referer'] = 'https://hermes-agent-desktop.local'
        headers['X-Title'] = 'Hermes Agent Desktop'

    # Build request body
    if provider == 'anthropic':
        body = {
            'model': model.replace('anthropic/', ''),
            'max_tokens': 4096,
            'messages': [
                m for m in messages if m['role'] != 'system'
            ] or [{'role': 'user', 'content': messages[-1]['content'] if messages else ''}],
        }
        system_msgs = [m for m in messages if m['role'] == 'system']
        if system_msgs:
            body['system'] = system_msgs[0]['content']
    else:
        body = {
            'model': model,
            'messages': messages,
            'max_tokens': 4096,
        }

    # Make HTTP request using urllib (stdlib, no pip dep)
    import urllib.request
    import urllib.error

    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode('utf-8'))

        if provider == 'anthropic':
            return result.get('content', [{}])[0].get('text', 'No response')
        else:
            choices = result.get('choices', [])
            if choices:
                msg = choices[0].get('message', {})
                return msg.get('content', 'No response')
            return 'Empty response from provider'

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8', errors='replace')
        try:
            error_json = json.loads(error_body)
            error_msg = error_json.get('error', {}).get('message', error_body)
        except Exception:
            error_msg = error_body[:500]
        raise RuntimeError(
            f'{provider_config["name"]} API error ({e.code}): {error_msg}'
        ) from e
    except urllib.error.URLError as e:
        raise RuntimeError(f'Network error calling {provider_config["name"]}: {e.reason}') from e


def build_conversation_history(message: str, config: dict) -> list:
    """Build a conversation messages list from the single message."""
    messages = []

    # Add system prompt
    hermes_home = get_hermes_home()
    system_prompt = (
        'You are Hermes Agent Desktop, a helpful AI assistant running on the user\'s Windows machine. '
        'You can help with coding, analysis, commands, and general questions. '
        'Be concise and helpful. Use markdown formatting for code blocks.'
    )
    messages.append({'role': 'system', 'content': system_prompt})

    # Add user message
    messages.append({'role': 'user', 'content': message})

    return messages


def handle_chat(message: str) -> dict:
    """Handle a chat message from the frontend."""
    hermes_home = get_hermes_home()

    msg_lower = message.lower().strip()

    # Local commands (no API call needed)
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
                'For AI chat, configure API keys in Settings.'
            )
        }

    if msg_lower in ('status', 'system status', '/status'):
        config = load_config()
        provider = config.get('model', {}).get('provider', 'not set')
        model = config.get('model', {}).get('default', 'not set')
        creds = load_credentials()
        has_keys = {k: bool(v) for k, v in creds.items()}

        return {
            'type': 'response',
            'content': (
                f'System Status:\n'
                f'  Platform: {platform.system()} {platform.release()}\n'
                f'  Python: {platform.python_version()}\n'
                f'  Architecture: {platform.machine()}\n'
                f'  Hermes Home: {hermes_home}\n'
                f'  Provider: {provider}\n'
                f'  Model: {model}\n'
                f'  API Keys configured: {sum(1 for v in has_keys.values() if v)}/{len(has_keys)}\n'
                f'  Time: {datetime.now().isoformat()}'
            )
        }

    if msg_lower in ('config', '/config'):
        config_path = os.path.join(hermes_home, 'config.json')
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

    # Try real AI API call
    try:
        config = load_config()
        creds = load_credentials()
        model = config.get('model', {}).get('default', 'anthropic/claude-sonnet-4')
        provider = get_provider_for_model(model, config)

        # Find the API key for this provider
        key_map = {
            'anthropic': 'anthropic_api_key',
            'openai': 'openai_api_key',
            'openrouter': 'openrouter_api_key',
            'alibaba-dashscope': 'dashscope_api_key',
            'xiaomi': 'xiaomi_api_key',
            'deepseek': 'deepseek_api_key',
            'google': 'google_api_key',
        }

        cred_key = key_map.get(provider, '')
        api_key = creds.get(cred_key, '')

        if not api_key:
            # Fallback to env vars
            env_key_map = {
                'anthropic': 'ANTHROPIC_API_KEY',
                'openai': 'OPENAI_API_KEY',
                'openrouter': 'OPENROUTER_API_KEY',
                'alibaba-dashscope': 'DASHSCOPE_API_KEY',
                'xiaomi': 'XIAOMI_API_KEY',
                'deepseek': 'DEEPSEEK_API_KEY',
                'google': 'GOOGLE_API_KEY',
            }
            api_key = os.environ.get(env_key_map.get(provider, ''), '')

        if not api_key:
            return {
                'type': 'response',
                'content': (
                    f'No API key configured for {provider}.\n\n'
                    'Please configure your API key in Settings → API Keys,\n'
                    'or set the appropriate environment variable.'
                )
            }

        messages = build_conversation_history(message, config)
        response = call_api(provider, model, api_key, messages)
        return {'type': 'response', 'content': response}

    except RuntimeError as e:
        return {
            'type': 'error',
            'content': f'API Error: {str(e)}'
        }
    except Exception as e:
        return {
            'type': 'error',
            'content': f'Error: {str(e)}\n\n'
                       f'The full Hermes Agent backend encountered an error.\n'
                       f'Check that your API keys are valid and the model is available.'
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
            elif msg_type == 'shutdown':
                # Graceful shutdown requested by Electron main process
                sys.exit(0)
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
