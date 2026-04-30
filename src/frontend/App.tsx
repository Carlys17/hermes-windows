import React, { useState, useEffect, useCallback, ErrorInfo, ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsView } from './components/SettingsView';
import { DashboardView } from './components/DashboardView';
import { Titlebar } from './components/Titlebar';
import { StatusBar } from './components/StatusBar';

type View = 'dashboard' | 'chat' | 'settings';

// --- Error Boundary ---
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <div className="text-center max-w-md p-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-4 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-hermes-500 rounded-lg text-white hover:bg-hermes-600 transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---
function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isReady, setIsReady] = useState(false);
  const [version, setVersion] = useState('');
  const [hermesStatus, setHermesStatus] = useState<'loading' | 'online' | 'offline'>('loading');

  // Navigation callback that children can use
  const navigateTo = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  useEffect(() => {
    let cleanupMessage: (() => void) | null = null;
    let cleanupExit: (() => void) | null = null;

    const init = async () => {
      try {
        const v = await window.electronAPI.getVersion();
        setVersion(v);

        // Check if Python backend is available
        const hermesHome = await window.electronAPI.getHermesHome();
        console.log('Hermes home:', hermesHome);

        // Register Python message listeners (returns cleanup functions)
        cleanupMessage = window.electronAPI.onPythonMessage((data) => {
          console.log('Python message:', data);
        });

        cleanupExit = window.electronAPI.onPythonExit((data) => {
          console.log('Python exited:', data);
          setHermesStatus('offline');
        });

        setIsReady(true);
        // Don't set online immediately — let the Python backend signal readiness
        // For now, assume online after init succeeds
        setHermesStatus('online');
      } catch (error) {
        console.error('Failed to initialize:', error);
        setHermesStatus('offline');
        setIsReady(true); // Still show UI even if backend fails
      }
    };

    init();

    return () => {
      // Proper per-listener cleanup (not removeAllListeners)
      cleanupMessage?.();
      cleanupExit?.();
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={navigateTo} />;
      case 'chat':
        return <ChatView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={navigateTo} />;
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-pulse-glow w-16 h-16 rounded-full bg-hermes-500 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Hermes Agent</h2>
          <p className="text-slate-400">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-slate-900">
        <Titlebar version={version} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            currentView={currentView}
            onViewChange={setCurrentView}
            hermesStatus={hermesStatus}
          />

          <main className="flex-1 overflow-hidden">
            {renderView()}
          </main>
        </div>

        <StatusBar hermesStatus={hermesStatus} version={version} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
