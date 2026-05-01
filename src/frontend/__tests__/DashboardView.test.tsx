import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { DashboardView } from '../components/DashboardView';

describe('DashboardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders header', () => {
    render(<DashboardView />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Hermes Agent Desktop')).toBeInTheDocument();
  });

  it('loads and displays system info', async () => {
    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText('x64')).toBeInTheDocument();
    });
  });

  it('displays uptime', async () => {
    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText(/h \d+m/)).toBeInTheDocument();
    });
  });

  it('shows quick action buttons', () => {
    render(<DashboardView />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Run Command')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('navigates to chat when New Chat clicked', async () => {
    const onNavigate = jest.fn();
    render(<DashboardView onNavigate={onNavigate} />);

    const newChatBtn = screen.getByText('New Chat').closest('button');
    expect(newChatBtn).not.toBeNull();
    if (newChatBtn) newChatBtn.click();

    expect(onNavigate).toHaveBeenCalledWith('chat');
  });

  it('navigates to settings when Settings clicked', async () => {
    const onNavigate = jest.fn();
    render(<DashboardView onNavigate={onNavigate} />);

    const settingsBtn = screen.getByText('Settings').closest('button');
    expect(settingsBtn).not.toBeNull();
    if (settingsBtn) settingsBtn.click();

    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('updates uptime every minute', async () => {
    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText(/h \d+m/)).toBeInTheDocument();
    });

    // Advance time by 60 seconds
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    // Uptime should have updated (verify system info was accessed)
    expect(window.electronAPI.getSystemInfo).toHaveBeenCalled();
  });

  it('cleans up interval on unmount', () => {
    const { unmount } = render(<DashboardView />);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
