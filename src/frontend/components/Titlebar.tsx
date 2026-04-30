import React from 'react';

interface TitlebarProps {
  version: string;
}

export function Titlebar({ version }: TitlebarProps) {
  return (
    <div className="titlebar bg-slate-800 border-b border-slate-700">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-hermes-500 animate-pulse-slow" />
        <span className="text-sm font-medium text-slate-300">
          Hermes Agent Desktop
        </span>
        <span className="text-xs text-slate-500">v{version}</span>
      </div>
      
      <div className="titlebar-title">
        {/* Center area - can be used for drag */}
      </div>
      
      <div className="flex items-center gap-1 titlebar-button">
        <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors" />
        <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors" />
        <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" />
      </div>
    </div>
  );
}
