import React, { useState, useEffect } from 'react';
import {
  Activity,
  Brain,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  MessageSquare,
  Terminal,
  Settings,
} from 'lucide-react';
import type { SystemInfo } from '../types';
import { formatBytes } from '../utils';

interface DashboardViewProps {
  onNavigate?: (view: 'dashboard' | 'chat' | 'settings') => void;
  hermesStatus?: 'loading' | 'online' | 'offline';
}

export function DashboardView({ onNavigate, hermesStatus = 'loading' }: DashboardViewProps) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [hermesHome, setHermesHome] = useState('');
  const [uptimeStr, setUptimeStr] = useState('0h 0m');

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const info = await window.electronAPI.getSystemInfo();
        setSystemInfo(info);

        const home = await window.electronAPI.getHermesHome();
        setHermesHome(home);
      } catch (error) {
        console.error('Failed to load system info:', error);
      }
    };

    loadInfo();

    // Update uptime every minute
    const interval = setInterval(() => {
      setSystemInfo(prev => prev ? { ...prev, uptime: prev.uptime + 60 } : prev);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Update uptime string when systemInfo changes
  useEffect(() => {
    if (systemInfo) {
      const hours = Math.floor(systemInfo.uptime / 3600);
      const minutes = Math.floor((systemInfo.uptime % 3600) / 60);
      setUptimeStr(`${hours}h ${minutes}m`);
    }
  }, [systemInfo]);

  const memPercent = systemInfo
    ? Math.round(((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100)
    : 0;

  const statusLabels: Record<string, string> = {
    loading: 'Initializing',
    online: 'Online',
    offline: 'Offline',
  };

  const statusColors: Record<string, string> = {
    loading: 'text-yellow-400',
    online: 'text-green-400',
    offline: 'text-red-400',
  };

  const statusBgColors: Record<string, string> = {
    loading: 'bg-yellow-400/10',
    online: 'bg-green-400/10',
    offline: 'bg-red-400/10',
  };

  const stats = [
    {
      label: 'Status',
      value: statusLabels[hermesStatus] ?? 'Unknown',
      icon: Activity,
      color: statusColors[hermesStatus] ?? 'text-slate-400',
      bgColor: statusBgColors[hermesStatus] ?? 'bg-slate-400/10',
    },
    {
      label: 'Platform',
      value: systemInfo ? `${systemInfo.platform} (${systemInfo.arch})` : 'Loading...',
      icon: Cpu,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Memory',
      value: systemInfo
        ? `${formatBytes(systemInfo.totalMemory - systemInfo.freeMemory)} / ${formatBytes(systemInfo.totalMemory)} (${memPercent}%)`
        : 'Loading...',
      icon: MemoryStick,
      color: memPercent > 80 ? 'text-red-400' : memPercent > 60 ? 'text-yellow-400' : 'text-purple-400',
      bgColor: memPercent > 80 ? 'bg-red-400/10' : memPercent > 60 ? 'bg-yellow-400/10' : 'bg-purple-400/10',
    },
    {
      label: 'Uptime',
      value: uptimeStr,
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
      action: () => onNavigate?.('chat'),
    },
    {
      label: 'Run Command',
      description: 'Execute a terminal command',
      icon: Terminal,
      color: 'from-green-400 to-green-600',
      action: () => onNavigate?.('chat'), // Commands go through chat
    },
    {
      label: 'AI Assistant',
      description: 'Get help with tasks',
      icon: Brain,
      color: 'from-purple-400 to-purple-600',
      action: () => onNavigate?.('chat'),
    },
    {
      label: 'Settings',
      description: 'Configure Hermes Agent',
      icon: Settings,
      color: 'from-orange-400 to-orange-600',
      action: () => onNavigate?.('settings'),
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
              <div className="text-lg font-bold text-white truncate" title={stat.value}>
                {stat.value}
              </div>
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

      {/* System Details */}
      {systemInfo && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">System Details</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Hostname</span>
                <span className="text-white font-mono">{systemInfo.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CPU</span>
                <span className="text-white font-mono text-right truncate max-w-[200px]" title={systemInfo.cpuModel}>
                  {systemInfo.cpuModel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Architecture</span>
                <span className="text-white font-mono">{systemInfo.arch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CPU Cores</span>
                <span className="text-white font-mono">{systemInfo.cpus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Memory</span>
                <span className="text-white font-mono">{formatBytes(systemInfo.totalMemory)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Free Memory</span>
                <span className="text-white font-mono">{formatBytes(systemInfo.freeMemory)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hermes Home Path */}
      <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
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
