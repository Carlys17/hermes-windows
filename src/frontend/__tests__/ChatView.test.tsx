import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ChatView } from '../components/ChatView';

const api = window.electronAPI as any;

describe('ChatView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders empty state with suggestions', () => {
    render(<ChatView />);
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByText('What can you do?')).toBeInTheDocument();
    expect(screen.getByText('Explain how Hermes works')).toBeInTheDocument();
  });

  it('shows header with status', () => {
    render(<ChatView hermesStatus="online" />);
    expect(screen.getByText('Chat with Hermes')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows offline status', () => {
    render(<ChatView hermesStatus="offline" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('allows typing in input', () => {
    render(<ChatView />);
    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(textarea).toHaveValue('Hello');
  });

  it('sends message on Enter', async () => {
    api.onPythonMessage.mockReturnValue(jest.fn());
    render(<ChatView />);
    const textarea = screen.getByPlaceholderText('Type a message...');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(api.sendChat).toHaveBeenCalledWith('Test message');
    });
  });

  it('does not send empty messages', async () => {
    api.onPythonMessage.mockReturnValue(jest.fn());
    render(<ChatView />);
    const textarea = screen.getByPlaceholderText('Type a message...');

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(api.sendChat).not.toHaveBeenCalled();
  });

  it('creates new line on Shift+Enter', () => {
    render(<ChatView />);
    const textarea = screen.getByPlaceholderText('Type a message...');

    const event = {
      key: 'Enter',
      shiftKey: true,
      preventDefault: jest.fn(),
    };
    fireEvent.keyDown(textarea, event);

    // Shift+Enter should NOT prevent default (it allows new line)
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('shows loading indicator when sending', async () => {
    api.onPythonMessage.mockReturnValue(jest.fn());
    api.sendChat.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );
    render(<ChatView />);
    const textarea = screen.getByPlaceholderText('Type a message...');

    fireEvent.change(textarea, { target: { value: 'Slow response' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });
  });

  it('disables send button when loading', async () => {
    api.onPythonMessage.mockReturnValue(jest.fn());
    api.sendChat.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );
    render(<ChatView />);
    const textarea = screen.getByPlaceholderText('Type a message...');

    fireEvent.change(textarea, { target: { value: 'Test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      const sendBtn = screen.getByLabelText('Send message');
      expect(sendBtn).toBeDisabled();
    });
  });

  it('renders suggestion buttons and fills input', () => {
    render(<ChatView />);
    const suggestionBtn = screen.getByText('What can you do?');
    fireEvent.click(suggestionBtn);

    const textarea = screen.getByPlaceholderText('Type a message...');
    expect(textarea).toHaveValue('What can you do?');
  });
});
