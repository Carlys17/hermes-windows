import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Check } from 'lucide-react';

interface ChatViewProps {
  hermesStatus?: 'loading' | 'online' | 'offline';
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export function ChatView({ hermesStatus = 'online' }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if user is near bottom before auto-scrolling
  const scrollToBottomIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // If user is within 150px of bottom, auto-scroll
    if (scrollHeight - scrollTop - clientHeight < 150) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to bottom when messages change (only if near bottom)
  useEffect(() => {
    scrollToBottomIfNearBottom();
  }, [messages]);

  // Cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Listen for Python messages with proper cleanup
  useEffect(() => {
    const cleanup = window.electronAPI.onPythonMessage((data) => {
      if (data.type === 'stdout') {
        // Parse JSON response from Python backend
        try {
          const parsed = JSON.parse(data.data);
          // Skip status/startup messages (e.g. "Hermes Agent backend started")
          if (parsed.type === 'status') return;

          const content: string =
            typeof parsed.content === 'string'
              ? parsed.content
              : typeof parsed.message === 'string'
              ? parsed.message
              : data.data; // Fallback: show raw if not parseable

          setMessages(prev => [...prev, {
            id: `py-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: parsed.type === 'error' ? 'system' : 'assistant',
            content,
            timestamp: new Date(),
          }]);
        } catch {
          // Not JSON — display raw (e.g. plain print() output from Python)
          setMessages(prev => [...prev, {
            id: `py-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'assistant',
            content: data.data.trim(),
            timestamp: new Date(),
          }]);
        }
      } else if (data.type === 'stderr') {
        const msg = data.data.trim();
        if (!msg) return; // Skip empty stderr lines
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'system',
          content: `[stderr] ${msg}`,
          timestamp: new Date(),
        }]);
      }
    });

    // Cleanup only this specific listener (not all listeners)
    return cleanup;
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput('');
    setIsLoading(true);

    // Force scroll to bottom when user sends a message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);

    try {
      const result = await window.electronAPI.sendChat(messageToSend);

      if (!result.success) {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: `Error: ${result.error ?? 'Failed to send message'}`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const statusLabel = {
    loading: 'Initializing...',
    online: 'Online',
    offline: 'Offline',
  };

  const statusDotClass = {
    loading: 'status-dot loading',
    online: 'status-dot online',
    offline: 'status-dot offline',
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Chat with Hermes</h1>
            <p className="text-sm text-slate-400">Ask anything, run commands, get help</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={statusDotClass[hermesStatus]} />
            <span className="text-sm text-slate-400">{statusLabel[hermesStatus]}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-hermes-400 to-hermes-600 flex items-center justify-center mb-4 shadow-lg shadow-hermes-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Start a conversation</h2>
            <p className="text-slate-400 max-w-md">
              Type a message below to chat with Hermes Agent. You can ask questions,
              request code, or run commands.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              {[
                'What can you do?',
                'Show me the system status',
                'Help me write a script',
                'Explain how Hermes works',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:border-hermes-500 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'message-user'
                    : message.role === 'system'
                    ? 'bg-yellow-900/30 border border-yellow-700'
                    : 'message-assistant'
                } px-4 py-3`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="text-xs text-slate-500 hover:text-white transition-colors"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="message-assistant px-4 py-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-hermes-400" />
                <span className="text-sm text-slate-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              maxLength={10000}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-slate-400 resize-none focus:border-hermes-500 focus:ring-1 focus:ring-hermes-500"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-hermes-500 text-white hover:bg-hermes-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500 text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
