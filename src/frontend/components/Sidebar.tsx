import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Terminal,
  Brain,
  Zap
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'chat' | 'settings') => void;
  hermesStatus: 'loading' | 'online' | 'offline';
}

export function Sidebar({ currentView, onViewChange, hermesStatus }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-2">
      {/* Logo */}
      <div className="mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-hermes-400 to-hermes-600 flex items-center justify-center shadow-lg">
          <Zap className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Status indicator */}
      <div className="mb-2">
        <div className={`status-dot ${hermesStatus}`} title={`Hermes: ${hermesStatus}`} />
      </div>

      {/* Menu items */}
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as any)}
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center transition-all
              ${isActive 
                ? 'bg-hermes-500 text-white shadow-lg shadow-hermes-500/30' 
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }
            `}
            title={item.label}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick actions */}
      <div className="flex flex-col gap-2">
        <button
          className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
          title="Terminal"
        >
          <Terminal className="w-5 h-5" />
        </button>
        <button
          className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
          title="AI Assistant"
        >
          <Brain className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
