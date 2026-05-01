#!/usr/bin/env python3
"""Tests for cli.py"""

import sys
import os
import pytest

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cli import ALLOWED_COMMANDS, DANGEROUS_CHARS


class TestWhitelist:
    """Test command whitelist."""

    def test_safe_commands_allowed(self):
        assert 'hermes' in ALLOWED_COMMANDS
        assert 'ls' in ALLOWED_COMMANDS
        assert 'cat' in ALLOWED_COMMANDS
        assert 'echo' in ALLOWED_COMMANDS
        assert 'pwd' in ALLOWED_COMMANDS
        assert 'grep' in ALLOWED_COMMANDS
        assert 'find' in ALLOWED_COMMANDS

    def test_dangerous_commands_not_allowed(self):
        assert 'python' not in ALLOWED_COMMANDS
        assert 'pip' not in ALLOWED_COMMANDS
        assert 'git' not in ALLOWED_COMMANDS
        assert 'node' not in ALLOWED_COMMANDS
        assert 'npm' not in ALLOWED_COMMANDS


class TestDangerousChars:
    """Test dangerous character detection."""

    def test_semicolon(self):
        assert ';' in DANGEROUS_CHARS

    def test_pipe(self):
        assert '|' in DANGEROUS_CHARS

    def test_ampersand(self):
        assert '&' in DANGEROUS_CHARS

    def test_backtick(self):
        assert '`' in DANGEROUS_CHARS

    def test_dollar(self):
        assert '$' in DANGEROUS_CHARS

    def test_parens(self):
        assert '(' in DANGEROUS_CHARS
        assert ')' in DANGEROUS_CHARS

    def test_null_byte(self):
        assert '\x00' in DANGEROUS_CHARS


class TestMainValidation:
    """Test main() validation logic."""

    def test_path_separators_rejected(self, monkeypatch, capsys):
        from cli import main
        monkeypatch.setattr(sys, 'argv', ['cli.py', '/usr/bin/ls'])
        result = main()
        captured = capsys.readouterr()
        assert result == 1
        assert 'Path separators not allowed' in captured.out

    def test_windows_path_separators_rejected(self, monkeypatch, capsys):
        from cli import main
        monkeypatch.setattr(sys, 'argv', ['cli.py', 'C:\\Windows\\system32\\cmd.exe'])
        result = main()
        captured = capsys.readouterr()
        assert result == 1
        assert 'Path separators not allowed' in captured.out

    def test_unauthorized_command_rejected(self, monkeypatch, capsys):
        from cli import main
        monkeypatch.setattr(sys, 'argv', ['cli.py', 'python'])
        result = main()
        captured = capsys.readouterr()
        assert result == 1
        assert 'not allowed' in captured.out

    def test_dangerous_arg_rejected(self, monkeypatch, capsys):
        from cli import main
        monkeypatch.setattr(sys, 'argv', ['cli.py', 'echo', 'hello;rm'])
        result = main()
        captured = capsys.readouterr()
        assert result == 1
        assert 'Dangerous character' in captured.out

    def test_hermes_help(self, monkeypatch, capsys):
        from cli import main
        monkeypatch.setattr(sys, 'argv', ['cli.py', 'hermes', 'help'])
        result = main()
        captured = capsys.readouterr()
        assert result == 0
        assert 'Hermes Agent CLI' in captured.out

    def test_hermes_status(self, monkeypatch, capsys):
        from cli import main
        monkeypatch.setattr(sys, 'argv', ['cli.py', 'hermes', 'status'])
        result = main()
        captured = capsys.readouterr()
        assert result == 0
        assert 'Hermes Home' in captured.out

    def test_hermes_version(self, monkeypatch, capsys):
        from cli import main
        monkeypatch.setattr(sys, 'argv', ['cli.py', 'hermes', 'version'])
        result = main()
        captured = capsys.readouterr()
        assert result == 0
        assert 'v1.0.0' in captured.out

    def test_no_args_shows_usage(self, monkeypatch, capsys):
        from cli import main
        monkeypatch.setattr(sys, 'argv', ['cli.py'])
        result = main()
        assert result == 1
