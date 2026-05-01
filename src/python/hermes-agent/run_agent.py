#!/usr/bin/env python3
"""
Hermes Agent Desktop - Backend Agent Runner

Electron starts this wrapper as a long-lived process. It reads JSON messages
from stdin and writes plain text responses to stdout so the renderer can show
chat output directly.

The wrapper can optionally use an installed upstream `hermes-agent` package,
but the repository also works in stub mode for builds where upstream Hermes is
not available on native Windows.
"""

import importlib
import json
import os
import platform
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional

_REAL_AGENT = None
_REAL_AGENT_ERROR: Optional[str] = None


def get_hermes_home() -> str:
    """Get the Hermes home directory."""
    return os.environ.get("HERMES_HOME", os.path.expanduser("~/.hermes"))


def _desktop_wrapper_dir() -> str:
    return str(Path(__file__).resolve().parent)


def _import_upstream_run_agent():
    """Import upstream run_agent without resolving back to this wrapper file."""
    wrapper_dir = os.path.normcase(os.path.abspath(_desktop_wrapper_dir()))
    original_path = list(sys.path)
    try:
        sys.path = [
            entry for entry in sys.path
            if os.path.normcase(os.path.abspath(entry or os.getcwd())) != wrapper_dir
        ]
        module = importlib.import_module("run_agent")
        if Path(getattr(module, "__file__", "")).resolve() == Path(__file__).resolve():
            raise ImportError("resolved desktop wrapper instead of upstream run_agent")
        return module
    finally:
        sys.path = original_path


def _get_real_agent():
    """Return a cached upstream AIAgent instance when the package is installed."""
    global _REAL_AGENT, _REAL_AGENT_ERROR

    if _REAL_AGENT is not None:
        return _REAL_AGENT
    if _REAL_AGENT_ERROR is not None:
        return None

    try:
        upstream = _import_upstream_run_agent()
        agent_cls = getattr(upstream, "AIAgent")
        model = os.environ.get("HERMES_MODEL", "")
        base_url = os.environ.get("OPENAI_BASE_URL", "")
        api_key = (
            os.environ.get("OPENROUTER_API_KEY")
            or os.environ.get("OPENAI_API_KEY")
            or os.environ.get("ANTHROPIC_API_KEY")
            or None
        )
        _REAL_AGENT = agent_cls(model=model, base_url=base_url, api_key=api_key)
        return _REAL_AGENT
    except Exception as exc:
        _REAL_AGENT_ERROR = str(exc)
        return None


def _stub_response(message: str) -> str:
    return (
        f"[Hermes Agent Desktop stub] Received: {message}\n\n"
        "The desktop wrapper is running, but the upstream Hermes Agent backend "
        "is not available in this embedded Python runtime.\n"
        "Run `setup-python.bat --with-upstream` to attempt an experimental "
        "native Windows install, or use Hermes Agent through WSL2 as upstream "
        "currently recommends."
    )


def handle_chat(message: str) -> str:
    """Handle a chat message from the frontend."""
    hermes_home = get_hermes_home()
    config_path = os.path.join(hermes_home, "config.yaml")
    msg_lower = message.lower().strip()

    if msg_lower in ("help", "what can you do?", "/help"):
        return (
            "Hermes Agent Desktop v1.0.0\n\n"
            "Available local commands:\n"
            "  help          - Show this help\n"
            "  status        - Show system status\n"
            "  config        - Show configuration path\n"
            "  version       - Show version info\n\n"
            "Full AI mode requires an installed upstream Hermes Agent package "
            "and provider credentials available to the Python process."
        )

    if msg_lower in ("status", "system status", "/status"):
        upstream_state = "available" if _get_real_agent() is not None else "not available"
        detail = f" ({_REAL_AGENT_ERROR})" if _REAL_AGENT_ERROR else ""
        return (
            "System Status:\n"
            f"  Platform: {platform.system()} {platform.release()}\n"
            f"  Python: {platform.python_version()}\n"
            f"  Architecture: {platform.machine()}\n"
            f"  Hermes Home: {hermes_home}\n"
            f"  Config: {'exists' if os.path.exists(config_path) else 'not found'}\n"
            f"  Upstream Hermes: {upstream_state}{detail}\n"
            f"  Time: {datetime.now().isoformat()}"
        )

    if msg_lower in ("config", "/config"):
        return f"Configuration path: {config_path}\nHermes Home: {hermes_home}"

    if msg_lower in ("version", "/version"):
        return (
            "Hermes Agent Desktop v1.0.0\n"
            f"Python {platform.python_version()}\n"
            f"Platform: {platform.system()} {platform.release()}"
        )

    agent = _get_real_agent()
    if agent is None:
        return _stub_response(message)

    try:
        response = agent.chat(message)
        return response or "(No response returned by Hermes Agent.)"
    except Exception as exc:
        return (
            "Hermes Agent returned an error:\n"
            f"{exc}\n\n"
            "Check provider credentials, config.yaml, and upstream Hermes logs."
        )


def write_response(text: str) -> None:
    print(text, flush=True)


def main() -> None:
    """Main loop: read JSON messages from stdin, write plain text responses."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            data = json.loads(line)
            msg_type = data.get("type", "")

            if msg_type == "shutdown":
                break
            if msg_type == "chat":
                write_response(handle_chat(data.get("message", "")))
            else:
                write_response(f"Unknown message type: {msg_type}")

        except json.JSONDecodeError:
            write_response(f"Invalid JSON: {line[:100]}")
        except Exception as exc:
            write_response(f"Error: {exc}\n{traceback.format_exc()}")


if __name__ == "__main__":
    main()
