import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
  Settings as SettingsIcon,
  Key,
  Terminal,
  Palette,
  Shield,
} from 'lucide-react';

interface Config {
  model: {
    default: string;
    provider: string;
  };
  agent: {
    max_turns: number;
  };
  terminal: {
    timeout: number;
  };
  display: {
    skin: string;
  };
}

interface ApiKeys {
  openrouter: string;
  anthropic: string;
  dashscope: string;
  xiaomi: string;
}

export function SettingsView() {
  const [config, setConfig] = useState<Config | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openrouter: '',
    anthropic: '',
    dashscope: '',
    xiaomi: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clampWarnings, setClampWarnings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const hermesConfig = await window.electronAPI.getConfig();
      setConfig(hermesConfig as Config ?? {
        model: { default: 'anthropic/claude-sonnet-4', provider: 'anthropic' },
        agent: { max_turns: 90 },
        terminal: { timeout: 180 },
        display: { skin: 'default' },
      });

      // Load encrypted credentials
      const [or, ant, ds, xm] = await Promise.all([
        window.electronAPI.getCredential('openrouter_api_key'),
        window.electronAPI.getCredential('anthropic_api_key'),
        window.electronAPI.getCredential('dashscope_api_key'),
        window.electronAPI.getCredential('xiaomi_api_key'),
      ]);

      setApiKeys({
        openrouter: or ?? '',
        anthropic: ant ?? '',
        dashscope: ds ?? '',
        xiaomi: xm ?? '',
      });
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Save config (non-sensitive)
      await window.electronAPI.setConfig('model', config.model);
      await window.electronAPI.setConfig('agent', config.agent);
      await window.electronAPI.setConfig('terminal', config.terminal);
      await window.electronAPI.setConfig('display', config.display);

      // Save or delete credentials based on whether key is empty
      const credEntries: [keyof ApiKeys, string, string][] = [
        ['openrouter', 'openrouter_api_key', apiKeys.openrouter],
        ['anthropic', 'anthropic_api_key', apiKeys.anthropic],
        ['dashscope', 'dashscope_api_key', apiKeys.dashscope],
        ['xiaomi', 'xiaomi_api_key', apiKeys.xiaomi],
      ];

      const credOps = credEntries.map(([, credKey, value]) => {
        if (value) {
          return window.electronAPI.setCredential(credKey, value);
        } else {
          // Empty key = delete the credential
          return window.electronAPI.deleteCredential(credKey);
        }
      });

      await Promise.all(credOps);

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadConfig();
  };

  const safeParseInt = (value: string, fallback: number, min?: number, max?: number): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return fallback;
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  };

  const handleNumericChange = (
    field: string,
    value: string,
    fallback: number,
    min: number,
    max: number,
    onChange: (parsed: number) => void
  ) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      onChange(fallback);
      setClampWarnings(prev => ({ ...prev, [field]: false }));
      return;
    }
    const clamped = safeParseInt(value, fallback, min, max);
    onChange(clamped);
    setClampWarnings(prev => ({ ...prev, [field]: parsed !== clamped }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-hermes-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load settings</h2>
          <p className="text-slate-400 mb-4 text-sm">{loadError}</p>
          <button
            onClick={loadConfig}
            className="px-4 py-2 bg-hermes-500 rounded-lg text-white hover:bg-hermes-600 transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sections = [
    {
      title: 'Model Configuration',
      icon: SettingsIcon,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Default Model
            </label>
            <select
              value={config?.model.default ?? ''}
              onChange={(e) => setConfig(prev => prev ? {
                ...prev,
                model: { ...prev.model, default: e.target.value }
              } : prev)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
            >
              <optgroup label="Anthropic">
                <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
                <option value="anthropic/claude-opus-4">Claude Opus 4</option>
              </optgroup>
              <optgroup label="OpenAI">
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
              </optgroup>
              <optgroup label="Alibaba (DashScope)">
                <option value="qwen3.5-plus">Qwen 3.5 Plus</option>
                <option value="qwen3.5-flash">Qwen 3.5 Flash</option>
                <option value="qwen3-max">Qwen 3 Max</option>
                <option value="qwen3-coder-plus-2025-09-23">Qwen 3 Coder Plus</option>
              </optgroup>
              <optgroup label="Xiaomi (MiMo)">
                <option value="mimo-v2.5-pro">MiMo v2.5 Pro</option>
                <option value="mimo-v2.5-flash">MiMo v2.5 Flash</option>
              </optgroup>
              <optgroup label="Others">
                <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                <option value="google/gemini-2.0-flash">Gemini 2.0 Flash</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Provider
            </label>
            <select
              value={config?.model.provider ?? ''}
              onChange={(e) => setConfig(prev => prev ? {
                ...prev,
                model: { ...prev.model, provider: e.target.value }
              } : prev)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="alibaba-dashscope">Alibaba DashScope</option>
              <option value="xiaomi">Xiaomi MiMo</option>
              <option value="deepseek">DeepSeek</option>
              <option value="google">Google</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      title: 'Agent Settings',
      icon: Terminal,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max Turns
            </label>
            <input
              type="number"
              value={config?.agent.max_turns ?? 90}
              onChange={(e) => handleNumericChange(
                'max_turns',
                e.target.value,
                90,
                1,
                500,
                (parsed) => setConfig(prev => prev ? {
                  ...prev,
                  agent: { ...prev.agent, max_turns: parsed }
                } : prev)
              )}
              min={1}
              max={500}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
            />
            {clampWarnings.max_turns && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Value clamped to allowed range (1–500)
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Terminal Timeout (seconds)
            </label>
            <input
              type="number"
              value={config?.terminal.timeout ?? 180}
              onChange={(e) => handleNumericChange(
                'timeout',
                e.target.value,
                180,
                10,
                3600,
                (parsed) => setConfig(prev => prev ? {
                  ...prev,
                  terminal: { ...prev.terminal, timeout: parsed }
                } : prev)
              )}
              min={10}
              max={3600}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
            />
            {clampWarnings.timeout && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Value clamped to allowed range (10–3600)
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'API Keys',
      icon: Key,
      content: (
        <div className="space-y-4">
          {[
            { key: 'openrouter' as keyof ApiKeys, label: 'OpenRouter API Key', placeholder: 'sk-or-...' },
            { key: 'anthropic' as keyof ApiKeys, label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
            { key: 'dashscope' as keyof ApiKeys, label: 'Alibaba DashScope API Key', placeholder: 'sk-sp-...', hint: 'For Qwen models (qwen3.5-plus, qwen3.5-flash, etc.) via Coding Plan' },
            { key: 'xiaomi' as keyof ApiKeys, label: 'Xiaomi MiMo API Key', placeholder: 'tp-...', hint: 'For MiMo models (mimo-v2.5-pro, etc.) via Token Plan' },
          ].map(({ key, label, placeholder, hint }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {label}
              </label>
              <div className="relative">
                <input
                  type={showApiKeys ? 'text' : 'password'}
                  value={apiKeys[key]}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 pr-10 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
                />
                <button
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  type="button"
                  aria-label={showApiKeys ? 'Hide API keys' : 'Show API keys'}
                >
                  {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {hint && (
                <p className="text-xs text-slate-500 mt-1">{hint}</p>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Display',
      icon: Palette,
      content: (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Theme
          </label>
          <select
            value={config?.display.skin ?? 'default'}
            onChange={(e) => setConfig(prev => prev ? {
              ...prev,
              display: { ...prev.display, skin: e.target.value }
            } : prev)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
          >
            <option value="default">Default (Dark)</option>
            <option value="light">Light</option>
            <option value="monokai">Monokai</option>
            <option value="dracula">Dracula</option>
          </select>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Configure Hermes Agent Desktop</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-hermes-500 rounded-lg text-sm text-white hover:bg-hermes-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveStatus === 'success' ? (
              <Check className="w-4 h-4" />
            ) : saveStatus === 'error' ? (
              <X className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-3">
                <Icon className="w-5 h-5 text-hermes-400" />
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              </div>
              <div className="p-6">
                {section.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-white mb-1">Security Note</h3>
            <p className="text-sm text-slate-400">
              API keys are encrypted using your system's native safeStorage (DPAPI on Windows, Keychain on macOS).
              Non-sensitive settings are stored in a local JSON config file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
