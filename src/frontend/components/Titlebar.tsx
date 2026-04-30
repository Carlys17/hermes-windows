import React from 'react';
import { Minus, Square, X } from 'lucide-react';

interface TitlebarProps {
  version: string;
}

export function Titlebar({ version }: TitlebarProps) {
  return (
    <div className="titlebar bg-slate-800 border-b border-slate-700 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-hermes-500 animate-pulse-slow" />
        <span className="text-sm font-medium text-slate-300">
          Hermes Agent Desktop
        </span>
        <span className="text-xs text-slate-500">v{version}</span>
      </div>

      <div className="titlebar-title flex-1" />

      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          className="w-8 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          onClick={() => window.electronAPI.minimizeWindow()}
          title="Minimize"
          aria-label="Minimize window"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          className="w-8 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          onClick={() => window.electronAPI.maximizeWindow()}
          title="Maximize"
          aria-label="Maximize window"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          className="w-8 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-colors"
          onClick={() => window.electronAPI.closeWindow()}
          title="Close"
          aria-label="Close window"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
