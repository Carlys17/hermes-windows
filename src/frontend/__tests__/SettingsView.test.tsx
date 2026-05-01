import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SettingsView } from '../components/SettingsView';

const api = window.electronAPI as any;

describe('SettingsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock setTimeout for save status timeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows loading spinner initially', () => {
    api.getConfig.mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves — stays loading
    );
    render(<SettingsView />);
    // Should show spinner, not content
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('renders settings sections after load', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    });

    expect(screen.getByText('Agent Settings')).toBeInTheDocument();
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('Display')).toBeInTheDocument();
  });

  it('shows save and reset buttons', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    });

    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('saves configuration', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.setConfig).toHaveBeenCalled();
    });
  });

  it('shows success state after save', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Saved!')).toBeInTheDocument();
    });
  });

  it('loads default config when getConfig returns null', async () => {
    api.getConfig.mockResolvedValueOnce(null);
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    });

    // Default model should be set
    expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
  });

  it('shows security note', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Security Note')).toBeInTheDocument();
    });
  });

  it('resets config when reset clicked', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    });

    const resetBtn = screen.getByText('Reset');
    fireEvent.click(resetBtn);

    // getConfig should be called again
    await waitFor(() => {
      expect(api.getConfig).toHaveBeenCalledTimes(2);
    });
  });

  it('shows error state on load failure', async () => {
    api.getConfig.mockRejectedValueOnce(new Error('Config error'));
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('retries config load on retry button click', async () => {
    api.getConfig
      .mockRejectedValueOnce(new Error('Config error'))
      .mockResolvedValueOnce({
        model: { default: 'anthropic/claude-sonnet-4', provider: 'anthropic' },
        agent: { max_turns: 90 },
        terminal: { timeout: 180 },
        display: { skin: 'default' },
      });

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });

    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    });
  });
});
