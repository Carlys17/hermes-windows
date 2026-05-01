import { render, screen, waitFor } from '@testing-library/react';

// Mock all child components
jest.mock('../components/Sidebar', () => ({
  Sidebar: ({ hermesStatus }: { hermesStatus: string }) => (
    <div data-testid="sidebar">Sidebar: {hermesStatus}</div>
  ),
}));
jest.mock('../components/ChatView', () => ({
  ChatView: ({ hermesStatus }: { hermesStatus: string }) => (
    <div data-testid="chat-view">Chat: {hermesStatus}</div>
  ),
}));
jest.mock('../components/SettingsView', () => ({
  SettingsView: () => <div data-testid="settings-view">Settings</div>,
}));
jest.mock('../components/DashboardView', () => ({
  DashboardView: ({ hermesStatus }: { hermesStatus: string }) => (
    <div data-testid="dashboard-view">Dashboard: {hermesStatus}</div>
  ),
}));
jest.mock('../components/Titlebar', () => ({
  Titlebar: ({ version }: { version: string }) => (
    <div data-testid="titlebar">Titlebar v{version}</div>
  ),
}));
jest.mock('../components/StatusBar', () => ({
  StatusBar: () => <div data-testid="statusbar">Status Bar</div>,
}));
jest.mock('../components/UpdateDialog', () => ({
  UpdateDialog: () => <div data-testid="update-dialog">UpdateDialog</div>,
}));
jest.mock('../styles/index.css', () => ({}), { virtual: true });

// Import App after mocks — use require() for CommonJS compat
const App = require('../App').default;

describe('App', () => {
  const api = window.electronAPI as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading screen initially', () => {
    api.getVersion.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve('1.0.0'), 100))
    );
    api.getHermesHome.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve('/home/test/.hermes'), 100))
    );

    render(<App />);
    expect(screen.getByText('Initializing...')).toBeInTheDocument();
  });

  it('renders main UI after initialization', async () => {
    api.getVersion.mockResolvedValueOnce('1.0.0');
    api.getHermesHome.mockResolvedValueOnce('/home/test/.hermes');
    api.onPythonExit.mockReturnValue(jest.fn());

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('titlebar')).toBeInTheDocument();
    });
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
    expect(screen.getByTestId('statusbar')).toBeInTheDocument();
  });

  it('displays app version in titlebar', async () => {
    api.getVersion.mockResolvedValueOnce('2.0.0');
    api.getHermesHome.mockResolvedValueOnce('/home/test/.hermes');
    api.onPythonExit.mockReturnValue(jest.fn());

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('titlebar')).toHaveTextContent('v2.0.0');
    });
  });
});
