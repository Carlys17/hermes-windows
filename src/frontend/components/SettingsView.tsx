import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  Settings as SettingsIcon,
  Key,
  Globe,
  Terminal,
  Bell,
  Shield,
  Palette
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

export function SettingsView() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const hermesConfig = await window.electronAPI.getConfig();
      setConfig(hermesConfig as Config || {
        model: { default: 'anthropic/claude-sonnet-4', provider: 'anthropic' },
        agent: { max_turns: 90 },
        terminal: { timeout: 180 },
        display: { skin: 'default' },
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await window.electronAPI.setConfig('model', config.model);
      await window.electronAPI.setConfig('agent', config.agent);
      await window.electronAPI.setConfig('terminal', config.terminal);
      await window.electronAPI.setConfig('display', config.display);
      
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-hermes-400" />
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
              value={config?.model.default || ''}
              onChange={(e) => setConfig(prev => prev ? {
                ...prev,
                model: { ...prev.model, default: e.target.value }
              } : prev)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
            >
              <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
              <option value="anthropic/claude-opus-4">Claude Opus 4</option>
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
              <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
              <option value="google/gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Provider
            </label>
            <select
              value={config?.model.provider || ''}
              onChange={(e) => setConfig(prev => prev ? {
                ...prev,
                model: { ...prev.model, provider: e.target.value }
              } : prev)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
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
              value={config?.agent.max_turns || 90}
              onChange={(e) => setConfig(prev => prev ? {
                ...prev,
                agent: { ...prev.agent, max_turns: parseInt(e.target.value) }
              } : prev)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Terminal Timeout (seconds)
            </label>
            <input
              type="number"
              value={config?.terminal.timeout || 180}
              onChange={(e) => setConfig(prev => prev ? {
                ...prev,
                terminal: { ...prev.terminal, timeout: parseInt(e.target.value) }
              } : prev)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
            />
          </div>
        </div>
      ),
    },
    {
      title: 'API Keys',
      icon: Key,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              OpenRouter API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-or-..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 pr-10 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-ant-..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 pr-10 text-white focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            API keys are stored securely in your system keychain.
          </p>
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
            value={config?.display.skin || 'default'}
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
              API keys and sensitive configuration are stored securely using your system's 
              native keychain. They are never stored in plain text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
