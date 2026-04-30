import React from 'react';
import { 
  Activity, 
  Cpu, 
  MemoryStick, 
  HardDrive,
  Wifi,
  Clock
} from 'lucide-react';

interface StatusBarProps {
  hermesStatus: 'loading' | 'online' | 'offline';
  version: string;
}

export function StatusBar({ hermesStatus, version }: StatusBarProps) {
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

        {/* Divider */}
        <div className="w-px h-4 bg-slate-600" />

        {/* System Info */}
        <div className="flex items-center gap-1 text-slate-400">
          <Cpu className="w-3 h-3" />
          <span>CPU: --</span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <MemoryStick className="w-3 h-3" />
          <span>Mem: --</span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <HardDrive className="w-3 h-3" />
          <span>Disk: --</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection */}
        <div className="flex items-center gap-1 text-slate-400">
          <Wifi className="w-3 h-3" />
          <span>Local</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-600" />

        {/* Version */}
        <span className="text-slate-500">v{version}</span>

        {/* Time */}
        <div className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
