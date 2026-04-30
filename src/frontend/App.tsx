import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsView } from './components/SettingsView';
import { DashboardView } from './components/DashboardView';
import { Titlebar } from './components/Titlebar';
import { StatusBar } from './components/StatusBar';

type View = 'dashboard' | 'chat' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isReady, setIsReady] = useState(false);
  const [version, setVersion] = useState('');
  const [hermesStatus, setHermesStatus] = useState<'loading' | 'online' | 'offline'>('loading');

  useEffect(() => {
    // Initialize app
    const init = async () => {
      try {
        // Get app version
        const v = await window.electronAPI.getVersion();
        setVersion(v);

        // Check Hermes status
        const hermesHome = await window.electronAPI.getHermesHome();
        console.log('Hermes home:', hermesHome);

        // Listen for Python messages
        window.electronAPI.onPythonMessage((data) => {
          console.log('Python message:', data);
        });

        window.electronAPI.onPythonExit((data) => {
          console.log('Python exited:', data);
          setHermesStatus('offline');
        });

        setIsReady(true);
        setHermesStatus('online');
      } catch (error) {
        console.error('Failed to initialize:', error);
        setHermesStatus('offline');
      }
    };

    init();

    return () => {
      window.electronAPI.removeAllListeners('python:message');
      window.electronAPI.removeAllListeners('python:exit');
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'chat':
        return <ChatView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
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
  );
}

export default App;
