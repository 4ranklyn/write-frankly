import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, ChatMessage } from '@/types/journal';
import { Send, X, RefreshCw } from 'lucide-react';
import { generateUniqueId, getCurrentTimestamp } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface CheckInHubProps {
  entry: JournalEntry;
  onClose: () => void;
  onSaveMessages: (messages: ChatMessage[]) => Promise<void>;
  isGuest: boolean;
}

export function CheckInHub({ entry, onClose, onSaveMessages, isGuest }: CheckInHubProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(entry.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial debrief trigger
  useEffect(() => {
    let mounted = true;
    const triggerDebrief = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/gemini/reflect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: entry.initialThought || 'I just finished writing my journal entry.',
            mode: 'debrief',
            history: [],
            title: entry.title,
            mood: entry.mood,
          }),
        });

        if (!response.ok) throw new Error('Failed to get reflection');
        
        const data = await response.json();
        const newMessage: ChatMessage = {
          id: generateUniqueId('msg'),
          role: 'assistant',
          content: data.text,
          timestamp: getCurrentTimestamp(),
          mode: 'debrief',
        };
        
        if (mounted) {
          const updatedMessages = [newMessage];
          setMessages(updatedMessages);
          await onSaveMessages(updatedMessages);
        }
      } catch (err) {
        console.error('Error during initial debrief:', err);
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
  }, [messages]);

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

    // Save immediately so state doesn't get lost
    await onSaveMessages(newMessages);

    try {
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg.content,
          mode: 'debrief',
          history: newMessages.slice(0, -1),
          title: entry.title,
          mood: entry.mood,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: generateUniqueId('msg'),
        role: 'assistant',
        content: data.text,
        timestamp: getCurrentTimestamp(),
        mode: 'debrief',
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await onSaveMessages(finalMessages);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 border-l border-zinc-200">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Check-in Hub</h2>
          <p className="text-xs text-zinc-500">Conversing with Frankly about &quot;{entry.title}&quot;</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
          aria-label="Close Check-in Hub"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-zinc-900 text-zinc-50 rounded-br-none'
                  : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none shadow-2xs'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-zinc max-w-none prose-p:leading-relaxed prose-a:text-blue-600">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-2xs flex items-center space-x-2">
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-zinc-200">
        <div className="flex space-x-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {["What felt hardest to write?", "I feel lighter now", "Help me reframe this"].map((reply) => (
            <button
              key={reply}
              onClick={() => handleQuickReply(reply)}
              className="whitespace-nowrap px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs rounded-full transition-colors border border-zinc-200"
            >
              {reply}
            </button>
          ))}
        </div>
        <div className="relative flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Reply to Frankly..."
            className="w-full resize-none bg-zinc-100 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-all border border-transparent focus:border-zinc-300"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 rounded-full bg-zinc-900 hover:bg-black text-white disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
