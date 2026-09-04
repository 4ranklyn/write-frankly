'use client';

import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, ChatMessage } from '@/types/journal';
import { Send, X, RefreshCw, Sparkles } from 'lucide-react';
import { generateUniqueId, getCurrentTimestamp, formatDateTime } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface CheckInHubProps {
  entry?: JournalEntry | null;
  recentEntries?: JournalEntry[];
  onClose: () => void;
  onSaveMessages?: (messages: ChatMessage[]) => Promise<void>;
  isGuest?: boolean;
}

export function CheckInHub({
  entry,
  recentEntries = [],
  onClose,
  onSaveMessages,
}: CheckInHubProps) {
  const isGlobal = !entry;
  const recentEntriesToUse = isGlobal ? (recentEntries || []).slice(0, 5) : [];
  
  // For specific entry, initialize with existing debrief messages if present
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (entry && entry.messages) {
      const existingDebrief = entry.messages.filter((m) => m.mode === 'debrief');
      if (existingDebrief.length > 0) return existingDebrief;
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close on ESC key without losing background state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Initial debrief / synthesis trigger
  useEffect(() => {
    let mounted = true;

    const triggerDebrief = async () => {
      setIsLoading(true);
      try {
        let promptPayload = '';
        let modePayload: 'debrief' | 'global_checkin' = 'debrief';
        let titlePayload = 'Holistic Check-in';
        let moodPayload = 'thoughtful';

        if (isGlobal) {
          modePayload = 'global_checkin';
          if (recentEntriesToUse.length > 0) {
            moodPayload = recentEntriesToUse[0]?.mood || 'thoughtful';
            const excerpts = recentEntriesToUse
              .map((e, idx) => {
                const dateStr = formatDateTime(e.createdAt);
                const moodStr = e.mood ? `Mood: ${e.mood}` : '';
                const textPreview =
                  (e.initialThought || e.messages.map((m) => m.content).join(' ')).trim().slice(0, 300) ||
                  'Brief reflection';
                return `[Entry ${idx + 1} | ${dateStr}${moodStr ? ` | ${moodStr}` : ''} | "${e.title || 'Untitled'}"]\n${textPreview}`;
              })
              .join('\n\n');

            promptPayload = `Here are my recent journal reflections and emotional trajectory:\n\n${excerpts}\n\nPlease check in with me as my holistic confidant. Review my recent themes and emotional trajectory, welcome me back, summarize the mood pattern gently, and ask how I am feeling right now in this moment.`;
          } else {
            promptPayload =
              'I am opening the Check-in Hub for the first time without any prior saved entries. Please welcome me warmly and ask how I am feeling right now in this moment.';
          }
        } else if (entry) {
          modePayload = 'debrief';
          titlePayload = entry.title || 'Reflection';
          moodPayload = entry.mood || 'thoughtful';
          promptPayload =
            entry.initialThought ||
            entry.messages.map((m) => m.content).join(' ') ||
            'I just finished writing my journal entry.';
        }

        const response = await fetch('/api/gemini/reflect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptPayload,
            mode: modePayload,
            history: [],
            title: titlePayload,
            mood: moodPayload,
          }),
        });

        if (!response.ok) throw new Error('Failed to get reflection');

        const data = await response.json();
        const newMessage: ChatMessage = {
          id: generateUniqueId('msg'),
          role: 'assistant',
          content: data.text,
          timestamp: getCurrentTimestamp(),
          mode: modePayload,
        };

        if (mounted) {
          const updatedMessages = [newMessage];
          setMessages(updatedMessages);
          if (onSaveMessages) {
            await onSaveMessages(updatedMessages);
          }
        }
      } catch (err) {
        console.error('Error during check-in hub debrief:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (messages.length === 0) {
      triggerDebrief();
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateUniqueId('msg'),
      role: 'user',
      content: input.trim(),
      timestamp: getCurrentTimestamp(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    if (onSaveMessages) {
      await onSaveMessages(newMessages);
    }

    try {
      const modePayload = isGlobal ? 'global_checkin' : 'debrief';
      const titlePayload = isGlobal ? 'Holistic Check-in' : entry?.title || 'Reflection';
      const moodPayload = isGlobal
        ? recentEntriesToUse[0]?.mood || 'thoughtful'
        : entry?.mood || 'thoughtful';

      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg.content,
          mode: modePayload,
          history: newMessages.slice(0, -1),
          title: titlePayload,
          mood: moodPayload,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: generateUniqueId('msg'),
        role: 'assistant',
        content: data.text,
        timestamp: getCurrentTimestamp(),
        mode: modePayload,
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      if (onSaveMessages) {
        await onSaveMessages(finalMessages);
      }
    } catch (err) {
      console.error('Error sending message in check-in hub:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
  };

  return (
    <div
      id="checkin-hub-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="checkin-hub-modal-card"
        className="w-full max-w-2xl bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[88vh] text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200 shrink-0">
              <Sparkles className="w-4 h-4 text-neutral-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-neutral-100 tracking-tight">Check-in Hub</h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {isGlobal ? 'Holistic Debrief' : 'Entry Debrief'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isGlobal
                  ? recentEntriesToUse.length > 0
                    ? `Synthesizing themes from your last ${recentEntriesToUse.length} reflection${recentEntriesToUse.length === 1 ? '' : 's'}`
                    : 'Holistic confidant check-in'
                  : `Conversing with Frankly about "${entry?.title || 'Reflection'}"`}
              </p>
            </div>
          </div>
          <button
            id="close-checkin-hub-btn"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Close Check-in Hub"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Conversation */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-2 mb-1 px-1">
                <span className="text-[10px] font-medium text-neutral-400">
                  {msg.role === 'user' ? 'You' : 'Frankly'}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-sm transition-all duration-150 ${
                  msg.role === 'user'
                    ? 'bg-white text-neutral-900 rounded-tr-xs shadow-xs font-normal'
                    : 'bg-neutral-800/90 border border-neutral-700/70 text-neutral-100 rounded-tl-xs shadow-xs'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none text-neutral-100 leading-relaxed space-y-2 text-[13px]">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-2">
              <div className="p-3.5 rounded-2xl bg-neutral-800/90 border border-neutral-700/70 text-neutral-300 rounded-tl-xs flex items-center space-x-2.5 shadow-xs">
                <RefreshCw className="w-3.5 h-3.5 text-neutral-300 animate-spin" />
                <span className="text-xs font-medium text-neutral-300">Frankly is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="pt-2 pb-2 border-t border-neutral-800 shrink-0">
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {(isGlobal
              ? [
                  'How does my trajectory look?',
                  'What pattern do you notice?',
                  'I feel a bit overwhelmed today',
                  'I feel centered right now',
                ]
              : [
                  'What felt hardest to write?',
                  'I feel lighter now',
                  'Help me unpack this feeling',
                  'What should I focus on next?',
                ]
            ).map((reply) => (
              <button
                key={reply}
                id={`quick-reply-${reply.slice(0, 10).toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => handleQuickReply(reply)}
                className="whitespace-nowrap px-3 py-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 text-xs rounded-full transition-colors border border-neutral-700/80 shrink-0 cursor-pointer"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Input Composer */}
        <div className="pt-2 shrink-0">
          <div className="relative flex items-end">
            <textarea
              id="checkin-hub-input-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Speak candidly with Frankly... (Enter to send, Shift+Enter for newline)"
              className="w-full resize-none bg-neutral-800/90 border border-neutral-700/90 focus:border-neutral-500 rounded-2xl pl-3.5 pr-12 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:ring-1 focus:ring-neutral-500 transition-all leading-relaxed"
              rows={2}
            />
            <button
              id="send-checkin-message-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message to Frankly"
              className="absolute right-2.5 bottom-2.5 p-1.5 rounded-full bg-white hover:bg-neutral-200 text-neutral-900 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500 px-1">
            <span>Press Esc to dismiss modal without losing editor work</span>
            <span>Multi-turn confidant debrief</span>
          </div>
        </div>
      </div>
    </div>
  );
}
