#!/usr/bin/env python3
"""Tests for run_agent.py"""

import json
import sys
import os
import pytest
from datetime import datetime

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from run_agent import handle_chat


class TestHandleChat:
    """Test handle_chat() responses."""

    def test_help_command(self):
        response = handle_chat('help')
        assert response['type'] == 'response'
        assert 'Hermes Agent Desktop' in response['content']
        assert 'Available commands' in response['content']

    def test_help_slash(self):
        response = handle_chat('/help')
        assert response['type'] == 'response'
        assert 'Hermes Agent Desktop' in response['content']

    def test_help_with_whitespace(self):
        response = handle_chat('  HELP  ')
        assert response['type'] == 'response'
        assert 'Hermes Agent Desktop' in response['content']

    def test_status_command(self):
        response = handle_chat('status')
        assert response['type'] == 'response'
        assert 'System Status' in response['content']
        assert 'Platform' in response['content']
        assert 'Python' in response['content']

    def test_system_status_alias(self):
        response = handle_chat('system status')
        assert response['type'] == 'response'
        assert 'Platform' in response['content']

    def test_version_command(self):
        response = handle_chat('version')
        assert response['type'] == 'response'
        assert 'v1.0.0' in response['content']

    def test_config_command(self):
        response = handle_chat('config')
        assert response['type'] == 'response'
        assert 'Configuration path' in response['content']

    def test_unknown_message_gets_stub_response(self):
        response = handle_chat('tell me a joke')
        assert response['type'] == 'response'
        assert 'Hermes Agent Stub' in response['content']
        assert 'tell me a joke' in response['content']

    def test_empty_message(self):
        response = handle_chat('')
        assert response['type'] == 'response'
        assert 'Hermes Agent Stub' in response['content']

    def test_what_can_you_do(self):
        response = handle_chat('What can you do?')
        assert response['type'] == 'response'
        assert 'Available commands' in response['content']


class TestGetHermesHome:
    """Test get_hermes_home()."""

    def test_default_home(self, monkeypatch):
        # Clear env override
        monkeypatch.delenv('HERMES_HOME', raising=False)
        from run_agent import get_hermes_home
        home = get_hermes_home()
        assert home.endswith('.hermes')

    def test_custom_home(self, monkeypatch):
        monkeypatch.setenv('HERMES_HOME', '/custom/hermes')
        from run_agent import get_hermes_home
        assert get_hermes_home() == '/custom/hermes'
