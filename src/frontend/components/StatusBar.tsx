import React, { useState, useEffect } from 'react';
import { Cpu, MemoryStick, HardDrive, Wifi, Clock } from 'lucide-react';
import type { SystemInfo } from '../types';
import { formatBytes } from '../utils';

interface StatusBarProps {
  hermesStatus: 'loading' | 'online' | 'offline';
  version: string;
}

export function StatusBar({ hermesStatus, version }: StatusBarProps) {
  const [time, setTime] = useState(new Date());
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch system info once
  useEffect(() => {
    window.electronAPI.getSystemInfo().then(setSysInfo).catch(console.error);
  }, []);

  const statusColor = {
    loading: 'text-yellow-400',
    online: 'text-green-400',
    offline: 'text-red-400',
  };

  const statusText = {
    loading: 'Initializing...',
    online: 'Ready',
    offline: 'Disconnected',
  };

  const memUsage = sysInfo
    ? `${formatBytes(sysInfo.totalMemory - sysInfo.freeMemory)}/${formatBytes(sysInfo.totalMemory)}`
    : '--';

  return (
    <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center gap-4">
        {/* Hermes Status */}
        <div className="flex items-center gap-2">
          <div className={`status-dot ${hermesStatus}`} />
          <span className={statusColor[hermesStatus]}>
            Hermes: {statusText[hermesStatus]}
          </span>
        </div>

        <div className="w-px h-4 bg-slate-600" />

        {/* System Info */}
        <div className="flex items-center gap-1 text-slate-400">
          <Cpu className="w-3 h-3" />
          <span>{sysInfo ? `${sysInfo.cpus} cores` : '--'}</span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <MemoryStick className="w-3 h-3" />
          <span>Mem: {memUsage}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-slate-400">
          <Wifi className="w-3 h-3" />
          <span>Local</span>
        </div>

        <div className="w-px h-4 bg-slate-600" />

        <span className="text-slate-500">v{version}</span>

        <div className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
