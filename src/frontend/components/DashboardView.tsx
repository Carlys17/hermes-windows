import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Brain, 
  Clock, 
  Cpu, 
  HardDrive, 
  MemoryStick,
  Zap,
  TrendingUp,
  MessageSquare,
  Terminal,
  Settings
} from 'lucide-react';

interface SystemInfo {
  platform: string;
  arch: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
}

export function DashboardView() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [hermesHome, setHermesHome] = useState('');

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const platform = await window.electronAPI.getPlatform();
        const home = await window.electronAPI.getHermesHome();
        
        setHermesHome(home);
        setSystemInfo({
          platform,
          arch: 'x64', // Default
          cpus: 8, // Default
          totalMemory: 16 * 1024 * 1024 * 1024, // 16GB default
          freeMemory: 8 * 1024 * 1024 * 1024, // 8GB default
          uptime: 0,
        });
      } catch (error) {
        console.error('Failed to load system info:', error);
      }
    };

    loadInfo();
  }, []);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const stats = [
    {
      label: 'Status',
      value: 'Online',
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      label: 'Platform',
      value: systemInfo?.platform || 'Unknown',
      icon: Cpu,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Memory',
      value: systemInfo ? `${formatBytes(systemInfo.freeMemory)} / ${formatBytes(systemInfo.totalMemory)}` : 'Loading...',
      icon: MemoryStick,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      label: 'Uptime',
      value: systemInfo ? formatUptime(systemInfo.uptime) : '0h 0m',
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
  ];

  const quickActions = [
    {
      label: 'New Chat',
      description: 'Start a conversation with Hermes',
      icon: MessageSquare,
      color: 'from-hermes-400 to-hermes-600',
      action: () => {/* Navigate to chat */},
    },
    {
      label: 'Run Command',
      description: 'Execute a terminal command',
      icon: Terminal,
      color: 'from-green-400 to-green-600',
      action: () => {/* Open terminal */},
    },
    {
      label: 'AI Assistant',
      description: 'Get help with tasks',
      icon: Brain,
      color: 'from-purple-400 to-purple-600',
      action: () => {/* Open assistant */},
    },
    {
      label: 'Settings',
      description: 'Configure Hermes Agent',
      icon: Settings,
      color: 'from-orange-400 to-orange-600',
      action: () => {/* Open settings */},
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Welcome to Hermes Agent Desktop</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.action}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-hermes-500 hover:shadow-lg hover:shadow-hermes-500/10 transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-medium text-white mb-1">{action.label}</h3>
                <p className="text-sm text-slate-400">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="space-y-3">
            {[
              { time: '2 min ago', action: 'Hermes Agent initialized', type: 'info' },
              { time: '5 min ago', action: 'Configuration loaded', type: 'success' },
              { time: '10 min ago', action: 'System check completed', type: 'info' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                }`} />
                <span className="text-sm text-slate-300 flex-1">{activity.action}</span>
                <span className="text-xs text-slate-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hermes Home Path */}
      <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <HardDrive className="w-4 h-4" />
          <span>Hermes Home:</span>
          <code className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">
            {hermesHome || 'Loading...'}
          </code>
        </div>
      </div>
    </div>
  );
}
