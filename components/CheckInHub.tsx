'use client';

import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, ChatMessage, UserPreferences, AIPersonality, getPersonaLabel } from '@/types/journal';
import { Send, X, RefreshCw, Sparkles, Sliders, MapPin, ClipboardCheck, Check } from 'lucide-react';
import { generateUniqueId, getCurrentTimestamp, formatDateTime } from '@/lib/utils';
import { sanitizePayload } from '@/lib/sanitizer';
import ReactMarkdown from 'react-markdown';
import { PersonalitySettings } from '@/components/PersonalitySettings';
import { getStoredUserPreferences, saveUserPreferences } from '@/lib/journal-service';

interface CheckInHubProps {
  entry?: JournalEntry | null;
  recentEntries?: JournalEntry[];
  onClose: () => void;
  onSaveMessages?: (messages: ChatMessage[]) => Promise<void>;
  isGuest?: boolean;
  preferences?: UserPreferences;
  onUpdatePreferences?: (preferences: UserPreferences) => Promise<void> | void;
  userId?: string;
  onSaveSuccess?: (message?: string) => void;
}

export function CheckInHub({
  entry,
  recentEntries = [],
  onClose,
  onSaveMessages,
  preferences,
  onUpdatePreferences,
  userId,
  onSaveSuccess,
}: CheckInHubProps) {
  const isGlobal = !entry;
  const recentEntriesToUse = isGlobal ? (recentEntries || []).slice(0, 5) : [];

  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => {
    return preferences || getStoredUserPreferences(userId);
  });
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  
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
  const [debriefPhase, setDebriefPhase] = useState<'idle' | 'reading' | 'synthesizing' | 'streaming'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUp = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      isUserScrolledUp.current = scrollHeight - (scrollTop + clientHeight) > 80;
    }
  };

  useEffect(() => {
    if (!isUserScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, debriefPhase]);

  // Close on ESC key without losing background state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [onClose]);

  // Initial debrief / synthesis trigger with streaming and progressive micro-feedback
  useEffect(() => {
    let mounted = true;

    const triggerDebrief = async () => {
      setIsLoading(true);
      setDebriefPhase('reading');

      const phaseTimer = setTimeout(() => {
        if (mounted) {
          setDebriefPhase((prev) => (prev === 'reading' ? 'synthesizing' : prev));
        }
      }, 1500);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 15000);

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

        const localityPayload = entry?.location || (isGlobal ? recentEntriesToUse[0]?.location : undefined);

        const response = await fetch('/api/gemini/reflect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reflectionText: promptPayload,
            prompt: promptPayload,
            mode: modePayload,
            history: [],
            title: titlePayload,
            mood: moodPayload,
            locality: localityPayload || undefined,
            tone: userPreferences.personality,
            personality: userPreferences.personality,
            customToneDirective: userPreferences.customToneDirective,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          let errMsg = `Status ${response.status}`;
          try {
            const parsed = JSON.parse(errBody);
            errMsg = parsed.error || errMsg;
          } catch {
            if (errBody) errMsg = errBody;
          }
          throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response stream is not readable');
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        const aiMsgId = generateUniqueId('msg_ai');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            clearTimeout(phaseTimer);
            accumulatedText += chunk;
            if (mounted) {
              setDebriefPhase('streaming');
              setMessages((prev) => {
                const exists = prev.some((m) => m.id === aiMsgId);
                if (!exists) {
                  return [
                    ...prev,
                    {
                      id: aiMsgId,
                      role: 'assistant',
                      content: accumulatedText,
                      timestamp: getCurrentTimestamp(),
                      mode: modePayload,
                    },
                  ];
                }
                return prev.map((m) => (m.id === aiMsgId ? { ...m, content: accumulatedText } : m));
              });
            }
          }
        }

        // On complete stream arrival: sanitize and non-blockingly persist
        if (mounted && accumulatedText) {
          const finalAiMessage: ChatMessage = {
            id: aiMsgId,
            role: 'assistant',
            content: accumulatedText,
            timestamp: getCurrentTimestamp(),
            mode: modePayload,
          };
          const updatedMessages = [finalAiMessage];
          setMessages(updatedMessages);
          if (onSaveMessages) {
            const sanitized = sanitizePayload(updatedMessages) as ChatMessage[];
            await onSaveMessages(sanitized);
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          console.log('[CheckInHub] Debrief stream aborted by user');
        } else {
          console.error('Error during check-in hub debrief:', err);
        }
      } finally {
        clearTimeout(phaseTimer);
        clearTimeout(timeoutId);
        if (mounted) {
          setIsLoading(false);
          setDebriefPhase('idle');
        }
      }
    };

    if (messages.length === 0) {
      triggerDebrief();
    }

    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: generateUniqueId('msg_user'),
      role: 'user',
      content: userText,
      timestamp: getCurrentTimestamp(),
      mode: 'debrief',
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // Optimistic background persistence of user input
    if (onSaveMessages) {
      const sanitized = sanitizePayload(newMessages) as ChatMessage[];
      onSaveMessages(sanitized).catch((e) => console.warn('Optimistic save notice:', e));
    }

    setIsLoading(true);
    setDebriefPhase('reading');

    const phaseTimer = setTimeout(() => {
      setDebriefPhase((prev) => (prev === 'reading' ? 'synthesizing' : prev));
    }, 1500);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 15000);

    try {
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflectionText: userText,
          prompt: userText,
          history: newMessages,
          mode: 'debrief',
          tone: userPreferences.personality,
          personality: userPreferences.personality,
          customToneDirective: userPreferences.customToneDirective,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        let errMsg = `Status ${response.status}`;
        try {
          const parsed = JSON.parse(errBody);
          errMsg = parsed.error || errMsg;
        } catch {
          if (errBody) errMsg = errBody;
        }
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response stream is not readable');
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      const aiMsgId = generateUniqueId('msg_ai');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          clearTimeout(phaseTimer);
          accumulatedText += chunk;
          setDebriefPhase('streaming');
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === aiMsgId);
            if (!exists) {
              return [
                ...prev,
                {
                  id: aiMsgId,
                  role: 'assistant',
                  content: accumulatedText,
                  timestamp: getCurrentTimestamp(),
                  mode: 'debrief',
                },
              ];
            }
            return prev.map((m) => (m.id === aiMsgId ? { ...m, content: accumulatedText } : m));
          });
        }
      }

      if (accumulatedText) {
        const aiMsg: ChatMessage = {
          id: aiMsgId,
          role: 'assistant',
          content: accumulatedText,
          timestamp: getCurrentTimestamp(),
          mode: 'debrief',
        };
        const finalMessages = [...newMessages, aiMsg];
        setMessages(finalMessages);
        if (onSaveMessages) {
          const sanitized = sanitizePayload(finalMessages) as ChatMessage[];
          await onSaveMessages(sanitized);
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') {
        console.log('[CheckInHub] Stream aborted by user');
      } else {
        console.error('Error in check-in conversation stream:', e);
      }
    } finally {
      clearTimeout(phaseTimer);
      clearTimeout(timeoutId);
      setIsLoading(false);
      setDebriefPhase('idle');
    }
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
  };

  const handleFinishDebrief = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (onSaveMessages && messages.length > 0) {
      const sanitized = sanitizePayload(messages) as ChatMessage[];
      await onSaveMessages(sanitized);
    }
    if (onSaveSuccess) {
      onSaveSuccess('Debrief saved successfully');
    }
    onClose();
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
              <ClipboardCheck className="w-4 h-4 text-neutral-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-base font-semibold text-neutral-100 tracking-tight">History & Debrief</h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {isGlobal ? 'Holistic Debrief & Reflection Archive' : 'Entry Debrief'}
                </span>
                {(entry?.location || (isGlobal && recentEntriesToUse[0]?.location)) && (
                  <span
                    id="checkin-hub-location-badge"
                    className="inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800/80 text-neutral-300 border border-neutral-700"
                    title={`Setting: ${entry?.location || recentEntriesToUse[0]?.location}`}
                  >
                    <MapPin className="w-2.5 h-2.5 text-neutral-400" />
                    <span className="truncate max-w-[140px]">{entry?.location || recentEntriesToUse[0]?.location}</span>
                  </span>
                )}
                <button
                  id="checkin-hub-persona-indicator-btn"
                  type="button"
                  onClick={() => setIsPersonalityModalOpen(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-amber-200 border border-neutral-700 hover:border-neutral-600 text-[10px] font-medium transition-colors cursor-pointer"
                  title="Click to customize Frankly's tone, warmth, and debriefing style"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>Speaking with Frankly ({getPersonaLabel(userPreferences.personality)})</span>
                  <Sliders className="w-2.5 h-2.5 ml-0.5 text-neutral-400" />
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isGlobal
                  ? recentEntriesToUse.length > 0
                    ? `Synthesizing themes from your last ${recentEntriesToUse.length} reflection${recentEntriesToUse.length === 1 ? '' : 's'}`
                    : 'Holistic confidant check-in & reflection archive'
                  : `Conversing with Frankly about "${entry?.title || 'Reflection'}"`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              id="finish-debrief-btn"
              onClick={handleFinishDebrief}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              title="Save debrief and finish"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done Debriefing</span>
            </button>
            <button
              id="close-checkin-hub-btn"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              aria-label="Close History & Debrief"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
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

          {isLoading && debriefPhase !== 'streaming' && (
            <div className="flex items-start space-x-2 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-neutral-800/90 border border-neutral-700/70 text-neutral-300 rounded-tl-xs flex items-center space-x-3 shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-neutral-200">
                    {debriefPhase === 'reading'
                      ? 'Frankly is reading your reflection...'
                      : 'Synthesizing core themes...'}
                  </span>
                  <span className="text-[10px] text-neutral-500 animate-pulse">
                    {debriefPhase === 'reading' ? 'Analyzing tone & context' : 'Formulating candid reflection'}
                  </span>
                </div>
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

      {/* Personality & Tone Settings Modal */}
      {isPersonalityModalOpen && (
        <PersonalitySettings
          isOpen={isPersonalityModalOpen}
          onClose={() => setIsPersonalityModalOpen(false)}
          currentPreferences={userPreferences}
          onSave={async (updated) => {
            setUserPreferences(updated);
            if (onUpdatePreferences) {
              await onUpdatePreferences(updated);
            } else if (userId) {
              await saveUserPreferences(userId, updated);
            }
          }}
        />
      )}
    </div>
  );
}
