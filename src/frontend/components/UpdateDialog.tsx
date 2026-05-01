import React, { useState, useEffect } from 'react';
import { Download, X, ArrowDownToLine } from 'lucide-react';

export function UpdateDialog() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [newVersion, setNewVersion] = useState('');

  useEffect(() => {
    const cleanupAvailable = window.electronAPI.onUpdateAvailable((data) => {
      setUpdateAvailable(true);
      setNewVersion(data.version);
    });

    const cleanupDownloaded = window.electronAPI.onUpdateDownloaded((data) => {
      setDownloading(false);
      setUpdateDownloaded(true);
      setNewVersion(data.version);
    });

    const cleanupProgress = window.electronAPI.onUpdateProgress((data) => {
      setProgress(Math.round(data.percent));
    });

    return () => {
      cleanupAvailable();
      cleanupDownloaded();
      cleanupProgress();
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    await window.electronAPI.downloadUpdate();
  };

  const handleInstall = async () => {
    await window.electronAPI.installUpdate();
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    setUpdateDownloaded(false);
  };

  if (!updateAvailable && !updateDownloaded) return null;

  return (
    <div className="fixed top-20 right-4 z-50 w-80">
      <div className="bg-slate-800 border border-blue-500/30 rounded-xl shadow-lg shadow-blue-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Update Available</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Dismiss update notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-slate-300 mb-3">
            {updateDownloaded
              ? `Hermes Agent Desktop ${newVersion} is ready to install.`
              : `A new version (${newVersion}) is available. Update now?`}
          </p>

          {/* Progress bar */}
          {downloading && (
            <div className="mb-3">
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{progress}% downloading...</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {updateDownloaded ? (
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-2 bg-blue-500 rounded-lg text-sm text-white hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install Now
              </button>
            ) : (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 px-3 py-2 bg-blue-500 rounded-lg text-sm text-white hover:bg-blue-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Downloading...' : 'Download'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
