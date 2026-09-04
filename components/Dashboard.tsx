'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { JournalEntry, ChatMessage, EntryMood, UserPreferences, AIPersonality } from '@/types/journal';
import { subscribeToUserEntries, saveJournalEntry, deleteJournalEntry } from '@/lib/journal-service';
import { getCurrentTimestamp, generateUniqueId, formatDateTime, formatTimeOnly } from '@/lib/utils';
import {
  Sparkles, Plus, Trash2, Download, Send, Search,
  AlertCircle, RefreshCw, Copy, Check, FileText, ListOrdered, Lightbulb, Compass,
  LogOut, PanelLeft, Sliders, MapPin,
} from 'lucide-react';
import Image from 'next/image';
import Markdown from 'react-markdown';
import { useLocation } from '@/hooks/useLocation';
import { useAutoSync } from '@/hooks/useAutoSync';
import { LocationTag } from '@/components/LocationTag';
import { CheckInHub } from '@/components/CheckInHub';
import { PersonalitySettings } from '@/components/PersonalitySettings';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { usePreferences } from '@/hooks/usePreferences';

const MOODS: { value: EntryMood; label: string; icon: string }[] = [
  { value: 'thoughtful', label: 'Thoughtful', icon: '🤔' },
  { value: 'grateful', label: 'Grateful', icon: '🙏' },
  { value: 'productive', label: 'Productive', icon: '⚡' },
  { value: 'inspired', label: 'Inspired', icon: '✨' },
  { value: 'stressed', label: 'Stressed', icon: '🌧️' },
  { value: 'curious', label: 'Curious', icon: '🔍' },
  { value: 'neutral', label: 'Neutral', icon: '🌱' },
];

const SUGGESTED_STARTERS = [
  'What am I avoiding saying out loud about this situation?',
  'Point out where my reasoning or narrative doesn’t quite add up.',
  'Here is what happened — give it to me straight without softening.',
  'What would I do if the excuse I just gave was not an option?',
];

const QUICK_ACTIONS: { id: string; label: string; mode: 'reflect' | 'summarize' | 'action_items' | 'reframe'; prompt: string; icon: React.ElementType }[] = [
  { id: 'action-deep-reflect-btn', label: 'Challenge Assumption', mode: 'reflect', prompt: 'Look at what I just wrote. What unexamined assumption or elephant in the room am I ignoring?', icon: Lightbulb },
  { id: 'action-summarize-btn', label: 'Cut to the Point', mode: 'summarize', prompt: 'Strip out all the rationalizations and state the raw core conflict and 1 sharp question.', icon: FileText },
  { id: 'action-next-steps-btn', label: 'Pragmatic Action', mode: 'action_items', prompt: 'Give me 1-2 realistic, non-negotiable practical steps and 1 sharp question on what is stopping me.', icon: ListOrdered },
  { id: 'action-reframe-btn', label: 'Call Out Contradiction', mode: 'reframe', prompt: 'Where am I contradicting myself or making excuses in what I just wrote?', icon: Compass },
];

export function Dashboard({
  sidebarOpen,
  onCloseSidebar,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  onToggleSidebar?: () => void;
}) {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [guestEntry, setGuestEntry] = useState<JournalEntry | null>(null);
  const isGuest = user?.isAnonymous ?? false;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');

  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckInHubOpen, setIsCheckInHubOpen] = useState(false);
  const [checkInTargetEntry, setCheckInTargetEntry] = useState<JournalEntry | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { preferences, updatePreferences: handleUpdatePreferences } = usePreferences();
  const [isPersonalitySettingsOpen, setIsPersonalitySettingsOpen] = useState(false);

  const getPersonaLabel = (id?: AIPersonality): string => {
    switch (id) {
      case 'pragmatic_coach':
        return 'Pragmatic Coach';
      case 'stoic_philosopher':
        return 'Stoic Philosopher';
      case 'socratic_inquirer':
        return 'Socratic Inquirer';
      case 'warm_confidant':
      default:
        return 'Warm Confidant';
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingSyncEntryRef = useRef<JournalEntry | null>(null);

  const { scheduleSync, flushPendingSync } = useAutoSync(async () => {
    if (!user || isGuest || !pendingSyncEntryRef.current) return;
    
    const entryToSave = pendingSyncEntryRef.current;
    setSaveStatus('saving');
    try {
      await saveJournalEntry(user.uid, entryToSave);
      if (pendingSyncEntryRef.current === entryToSave) {
        pendingSyncEntryRef.current = null;
      }
      setSaveStatus('saved');
      setErrorMessage(null);
    } catch {
      setErrorMessage('Failed to sync metadata to Firestore.');
      setSaveStatus('error');
    }
  }, 1000);

  // Unload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSyncEntryRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSelectStarter = (starter: string) => {
    setPromptInput(starter);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(starter.length, starter.length);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (isGuest) {
      if (!guestEntry) {
        const timestamp = getCurrentTimestamp();
        const newId = generateUniqueId('entry');
        const formattedDate = new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const newEntry: JournalEntry = {
          id: newId,
          userId: user.uid,
          title: '',
          initialThought: '',
          mood: 'thoughtful',
          tags: [],
          messages: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGuestEntry(newEntry);
        setEntries([newEntry]);
        setSelectedEntryId(newId);
      } else {
        setEntries([guestEntry]);
      }
      return;
    }
    
    if (guestEntry) {
      const migrate = async () => {
        try {
          const entryToMigrate = { ...guestEntry, userId: user.uid };
          await saveJournalEntry(user.uid, entryToMigrate);
          setGuestEntry(null);
        } catch (e) {
          console.error('Failed to migrate guest entry:', e);
        }
      };
      migrate();
    }
    
    return subscribeToUserEntries(
      user.uid,
      (userEntries) => {
        setEntries((prevEntries) => {
          // If we have pending edits, ensure the incoming data doesn't overwrite them
          if (pendingSyncEntryRef.current) {
            return userEntries.map(e => 
              e.id === pendingSyncEntryRef.current?.id ? pendingSyncEntryRef.current : e
            );
          }
          return userEntries;
        });
        setSelectedEntryId((prev) => (prev && userEntries.some((e) => e.id === prev) ? prev : userEntries[0]?.id || null));
      },
      (err) => {
        setErrorMessage(`Firestore synchronization error: ${err.message}`);
        setSaveStatus('error');
      }
    );
  }, [user, isGuest, guestEntry]);

  const activeEntry = useMemo(() => entries.find((e) => e.id === selectedEntryId) || null, [entries, selectedEntryId]);

  const effectiveLocation = currentLocation !== undefined ? currentLocation : activeEntry?.location;

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    setCurrentLocation(entry.location);
    if (typeof window !== 'undefined' && window.innerWidth < 768) onCloseSidebar();
  };

  const handleLocationChange = (loc: string | null) => {
    const nextLoc = loc || undefined;
    setCurrentLocation(nextLoc);
    handleUpdateMetadata({ location: nextLoc });
  };

  const editorWordCount = useMemo(() => {
    const currentDraft = promptInput.trim();
    const messagesText = (activeEntry?.messages || []).map((m) => m.content).join(' ');
    const combinedText = [activeEntry?.initialThought || '', messagesText, currentDraft]
      .filter(Boolean)
      .join(' ')
      .trim();

    const words = combinedText ? combinedText.split(/\s+/).filter(Boolean).length : 0;
    const characters = combinedText ? combinedText.length : 0;

    return { words, characters };
  }, [activeEntry, promptInput]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeEntry?.messages?.length, isGenerating]);

  const handleCreateNewEntry = async () => {
    if (!user) return;
    setCurrentLocation(undefined);
    if (isGuest) {
      if (guestEntry && guestEntry.messages.length > 0) {
        alert("Guest session limit reached (1/1 entry). Create an account to unlock unlimited, encrypted journaling.");
        return;
      }
      // If empty, let them just use the current guest entry
      return;
    }

    const timestamp = getCurrentTimestamp();
    const newId = generateUniqueId('entry');
    const formattedDate = new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const newEntry: JournalEntry = {
      id: newId,
      userId: user.uid,
      title: '',
      initialThought: '',
      mood: 'thoughtful',
      tags: [],
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setSaveStatus('saving');
    try {
      await saveJournalEntry(user.uid, newEntry);
      setSelectedEntryId(newId);
      setSaveStatus('saved');
      setErrorMessage(null);
      if (typeof window !== 'undefined' && window.innerWidth < 768) onCloseSidebar();
    } catch (err: unknown) {
      setErrorMessage(`Failed to initialize reflection in Firestore: ${err instanceof Error ? err.message : 'Error'}`);
      setSaveStatus('error');
    }
  };

  const handleUpdateMetadata = (updates: Partial<JournalEntry>) => {
    if (!user || !activeEntry) return;
    const updated: JournalEntry = { ...activeEntry, ...updates, updatedAt: getCurrentTimestamp() };
    
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    
    if (isGuest) {
      setGuestEntry(updated);
    } else {
      pendingSyncEntryRef.current = updated;
      scheduleSync();
    }
    
    if (updates.isFinalized) {
      flushPendingSync();
      setIsCheckInHubOpen(true);
    }
  };

  const handleSendPrompt = async (
    customPrompt?: string,
    mode: 'general' | 'reflect' | 'summarize' | 'action_items' | 'reframe' = 'reflect'
  ) => {
    flushPendingSync();
    const textToSend = (customPrompt || promptInput).trim();
    if (!textToSend || !user || !activeEntry || isGenerating) return;

    const userTimestamp = getCurrentTimestamp();
    const userMessage: ChatMessage = {
      id: generateUniqueId('msg_user'),
      role: 'user',
      content: textToSend,
      timestamp: userTimestamp,
      mode,
    };

    const updatedMessages = [...(activeEntry.messages || []), userMessage];
    const updatedEntry: JournalEntry = {
      ...activeEntry,
      location: effectiveLocation,
      initialThought: activeEntry.initialThought || textToSend,
      messages: updatedMessages,
      updatedAt: userTimestamp,
    };

    setPromptInput('');
    setIsGenerating(true);
    setSaveStatus('saving');

    try {
      if (isGuest) {
        setGuestEntry(updatedEntry);
        setEntries([updatedEntry]);
      } else {
        await saveJournalEntry(user.uid, updatedEntry);
      }

      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          mode,
          title: activeEntry.title,
          mood: activeEntry.mood,
          locality: effectiveLocation || undefined,
          history: updatedMessages,
          personality: preferences.personality,
          customToneDirective: preferences.customToneDirective,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Status ${response.status}`);
      }

      const data = await response.json();
      const aiTimestamp = getCurrentTimestamp();
      const assistantMessage: ChatMessage = {
        id: generateUniqueId('msg_ai'),
        role: 'assistant',
        content: data.text || 'Unable to generate reflection.',
        timestamp: aiTimestamp,
        mode,
      };

      const finalEntry: JournalEntry = {
        ...updatedEntry,
        messages: [...updatedMessages, assistantMessage],
        summary: mode === 'summarize' ? data.text : updatedEntry.summary,
        updatedAt: aiTimestamp,
      };

      if (isGuest) {
        setGuestEntry(finalEntry);
        setEntries([finalEntry]);
      } else {
        await saveJournalEntry(user.uid, finalEntry);
      }

      setSaveStatus('saved');
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(`Reflection could not be saved: ${err instanceof Error ? err.message : 'Error communicating with Gemini'}`);
      setSaveStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    
    if (isGuest) {
      setGuestEntry(null);
      setEntries([]);
      setSelectedEntryId(null);
      setDeleteConfirmId(null);
      return;
    }
    
    try {
      if (pendingSyncEntryRef.current?.id === entryId) {
        pendingSyncEntryRef.current = null;
      }
      await deleteJournalEntry(user.uid, entryId);
      setDeleteConfirmId(null);
      if (selectedEntryId === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        setSelectedEntryId(remaining[0]?.id || null);
      }
    } catch {
      setErrorMessage('Failed to delete reflection from Firestore.');
    }
  };

  const handleExportMarkdown = () => {
    if (!activeEntry) return;
    const locHeader = effectiveLocation ? `\n**Location:** ${effectiveLocation}` : '';
    let md = `# ${activeEntry.title || 'Untitled Reflection'}\n\n**Date:** ${new Date(activeEntry.createdAt).toLocaleString()}\n**Mood:** ${activeEntry.mood}${locHeader}\n\n## Journal Dialogue\n\n`;
    activeEntry.messages.forEach((msg) => {
      md += msg.role === 'user'
        ? `### 👤 Entry Note (${new Date(msg.timestamp).toLocaleTimeString()})\n${msg.content}\n\n`
        : `### ✍️ WriteFrankly [${msg.mode || 'Inquiry'}]\n${msg.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeEntry.title || 'reflection').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyExportText = () => {
    if (!activeEntry) return;
    const locHeader = effectiveLocation ? `\n**Location:** ${effectiveLocation}` : '';
    let md = `# ${activeEntry.title || 'Untitled Reflection'}\n\n**Date:** ${new Date(activeEntry.createdAt).toLocaleString()}\n**Mood:** ${activeEntry.mood}${locHeader}\n\n## Journal Dialogue\n\n`;
    activeEntry.messages.forEach((msg) => {
      md += msg.role === 'user'
        ? `### 👤 Entry Note (${new Date(msg.timestamp).toLocaleTimeString()})\n${msg.content}\n\n`
        : `### ✍️ WriteFrankly [${msg.mode || 'Inquiry'}]\n${msg.content}\n\n`;
    });
    navigator.clipboard.writeText(md);
    alert('Entry copied to clipboard!');
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return entries.filter((entry) => {
      const matchesSearch = !q || entry.title.toLowerCase().includes(q) ||
        entry.initialThought.toLowerCase().includes(q) ||
        entry.messages.some((m) => m.content.toLowerCase().includes(q));
      return matchesSearch && (selectedMoodFilter === 'all' || entry.mood === selectedMoodFilter);
    });
  }, [entries, searchQuery, selectedMoodFilter]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#fafafa] relative">
      {/* Sidebar */}
      <aside
        id="history-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-20 w-80 bg-zinc-50/90 backdrop-blur-xl border-r border-zinc-200/70 flex flex-col transition-transform duration-200 ease-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3.5 border-b border-zinc-200/50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-50 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-zinc-100" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-semibold text-zinc-900 text-xs tracking-tight">WriteFrankly</span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              id="sidebar-new-entry-btn"
              onClick={handleCreateNewEntry}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 active:bg-black text-zinc-50 text-xs font-medium transition-all duration-200 shadow-2xs cursor-pointer"
              title="Create New Reflection"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-zinc-200/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              id="sidebar-search-input"
              type="text"
              placeholder="Search reflections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-zinc-200/50 focus:bg-white border border-transparent focus:border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden transition-all duration-150"
            />
          </div>

          <div className="flex items-center space-x-1 mt-2.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {[{ value: 'all', label: `All (${entries.length})`, icon: '' }, ...MOODS].map((m) => {
              const active = selectedMoodFilter === m.value;
              return (
                <button
                  key={m.value}
                  id={`filter-mood-${m.value}`}
                  onClick={() => setSelectedMoodFilter(m.value)}
                  className={`px-2.5 py-0.5 rounded-full border transition-all duration-150 shrink-0 ${
                    active ? 'bg-zinc-900 text-zinc-50 border-zinc-900 font-medium' : 'bg-white/80 text-zinc-600 border-zinc-200/80 hover:bg-white'
                  }`}
                >
                  {m.icon && <span className="mr-0.5">{m.icon}</span>}{m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 px-4 text-zinc-400">
              <Compass className="w-7 h-7 mx-auto text-zinc-300 mb-2 stroke-1" />
              <p className="text-xs font-medium text-zinc-600">No reflections found</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {searchQuery ? 'Try a different search term' : 'Create your first reflection'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreateNewEntry}
                  className="mt-3 px-3 py-1 rounded-full bg-zinc-900 text-zinc-50 text-xs font-medium hover:bg-zinc-800 transition-colors inline-flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Start Reflecting</span>
                </button>
              )}
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = entry.id === selectedEntryId;
              const moodInfo = MOODS.find((m) => m.value === entry.mood) || MOODS[0];
              return (
                <div
                  key={entry.id}
                  id={`entry-item-${entry.id}`}
                  onClick={() => handleSelectEntry(entry)}
                  className={`p-2.5 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
                    isSelected ? 'bg-white border-zinc-300 shadow-2xs' : 'bg-transparent hover:bg-white/60 border-transparent hover:border-zinc-200/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className={`text-xs truncate pr-2 ${isSelected ? 'text-zinc-950 font-semibold' : 'text-zinc-800 font-medium'}`}>
                      {entry.title || 'Untitled Reflection'}
                    </h3>
                    <span id={`entry-timestamp-${entry.id}`} className="text-[10px] text-zinc-400 shrink-0 font-normal">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-1">
                    {entry.initialThought || entry.messages[0]?.content || 'Empty reflection...'}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100 flex-wrap gap-1">
                    <div className="flex items-center space-x-1 flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-zinc-100 text-zinc-800 border-zinc-200/80">
                        {moodInfo.icon} {moodInfo.label}
                      </span>
                      {entry.location && (
                        <span
                          id={`entry-location-pill-${entry.id}`}
                          className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-zinc-100 text-zinc-600 border-zinc-200/80 flex items-center space-x-1 max-w-[130px] truncate"
                          title={`Location: ${entry.location}`}
                        >
                          <MapPin className="w-2.5 h-2.5 shrink-0 text-zinc-500" />
                          <span className="truncate">{entry.location}</span>
                        </span>
                      )}
                      {entry.messages.some(m => m.mode === 'debrief') && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-indigo-50 text-indigo-700 border-indigo-200/80 flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Checked in</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {entry.messages.length} {entry.messages.length === 1 ? 'turn' : 'turns'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Left lower side of app UI: User Profile & Controls */}
        <div id="sidebar-user-footer" className="p-3 border-t border-zinc-200/60 bg-zinc-100/60 backdrop-blur-xs">
          <div className="mb-2">
            <PWAInstallButton variant="sidebar" />
          </div>

          <button
            id="sidebar-personality-settings-btn"
            type="button"
            onClick={() => setIsPersonalitySettingsOpen(true)}
            className="w-full mb-2.5 px-2.5 py-1.5 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
            title="Customize Frankly's Tone & Personality"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
              <span>Tone: <strong className="font-semibold text-zinc-900">{getPersonaLabel(preferences.personality)}</strong></span>
            </div>
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {user && !isGuest ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                {user.photoURL ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-200/80 shrink-0">
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      fill
                      priority
                      sizes="32px"
                      referrerPolicy="no-referrer"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-medium shrink-0">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 text-left">
                  <p className="text-xs font-medium text-zinc-900 leading-tight truncate">
                    {user.displayName || 'Reflector'}
                  </p>
                  <p className="text-[10px] text-zinc-400 leading-tight truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                id="sign-out-btn"
                onClick={signOutUser}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/70 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-medium text-zinc-600">Guest Mode</span>
              </div>
              <button
                onClick={signInWithGoogle}
                className="text-xs font-medium text-zinc-900 hover:underline px-2.5 py-1 rounded-md bg-white border border-zinc-200 shadow-2xs"
              >
                Sign In
              </button>
            </div>
          )}

          <div className="mt-2 md:hidden">
            <button
              onClick={onCloseSidebar}
              className="w-full py-1.5 rounded-xl bg-zinc-200/70 text-zinc-700 text-xs font-medium hover:bg-zinc-200 transition-colors"
            >
              Close History
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div onClick={onCloseSidebar} className="fixed inset-0 bg-black/20 backdrop-blur-xs z-10 md:hidden" />}

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {activeEntry ? (
          <>
            <div className="px-3 sm:px-6 py-2 sm:py-2.5 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl flex flex-col gap-1.5 shrink-0 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 shrink-0 min-w-0">
                <div className="flex items-center space-x-2 sm:space-x-2.5 flex-1 min-w-0">
                  {onToggleSidebar && (
                    <button
                      id="mobile-sidebar-toggle-btn"
                      onClick={onToggleSidebar}
                      aria-label="Toggle history sidebar"
                      className="md:hidden p-1.5 -ml-1 rounded-lg text-zinc-600 hover:bg-zinc-100/80 active:bg-zinc-200/70 transition-colors shrink-0"
                      title="Toggle sidebar"
                    >
                      <PanelLeft className="w-4 h-4" />
                    </button>
                  )}
                  <input
                    id="entry-title-input"
                    type="text"
                    value={activeEntry.title === 'Untitled Reflection' ? '' : activeEntry.title}
                    onChange={(e) => handleUpdateMetadata({ title: e.target.value })}
                    onBlur={flushPendingSync}
                    placeholder="Untitled Reflection"
                    className="font-semibold text-sm sm:text-base text-zinc-900 placeholder:text-zinc-400/60 placeholder:font-normal placeholder:italic bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-hidden px-1 py-0.5 transition-colors flex-1 min-w-[120px] max-w-md truncate"
                  />
                  <select
                    id="entry-mood-select"
                    value={activeEntry.mood}
                    onChange={(e) => handleUpdateMetadata({ mood: e.target.value as EntryMood })}
                    className="text-xs px-2.5 py-1 rounded-full border border-zinc-200/80 bg-zinc-50 text-zinc-700 font-medium hover:bg-zinc-100 focus:outline-hidden shrink-0"
                  >
                    {MOODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                  <LocationTag value={effectiveLocation} onChange={handleLocationChange} />
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                  {isGuest && (
                    <div
                      title="Guest Mode: Entries are not stored on our servers. Export your text before leaving."
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center space-x-1.5 shrink-0 whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Guest Mode (Not Saved)</span>
                    </div>
                  )}

                  {isGuest ? (
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={handleExportMarkdown}
                        title="Download as Markdown (.md)"
                        className="p-1.5 rounded-lg border border-zinc-200/80 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors text-xs flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Export .md</span>
                      </button>
                      <button
                        onClick={handleCopyExportText}
                        title="Copy Raw Text to Clipboard"
                        className="p-1.5 rounded-lg border border-zinc-200/80 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors text-xs flex items-center space-x-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copy Text</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      id="export-entry-btn"
                      onClick={handleExportMarkdown}
                      title="Export reflection as Markdown"
                      className="p-1.5 rounded-lg border border-zinc-200/80 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors text-xs flex items-center space-x-1 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                  )}

                  <button
                    id="toolbar-entry-debrief-btn"
                    onClick={() => {
                      flushPendingSync();
                      setCheckInTargetEntry(activeEntry);
                      setIsCheckInHubOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-full bg-zinc-900 text-zinc-50 hover:bg-zinc-800 transition-colors text-xs font-medium flex items-center space-x-1 shrink-0 cursor-pointer shadow-2xs"
                    title="Check-in Here"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="hidden sm:inline">Check-in Here</span>
                  </button>

                  {deleteConfirmId === activeEntry.id ? (
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        id="confirm-delete-btn"
                        onClick={() => handleDeleteEntry(activeEntry.id)}
                        className="px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 rounded-full bg-zinc-200 text-zinc-700 text-xs font-medium hover:bg-zinc-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      id="delete-entry-btn"
                      onClick={() => setDeleteConfirmId(activeEntry.id)}
                      title="Delete reflection"
                      className="p-1.5 rounded-lg border border-zinc-200/80 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Subtle Timestamp Indicator */}
              <div
                id="editor-timestamp-indicator"
                className="flex items-center space-x-2 text-[11px] text-zinc-400 font-normal px-1"
              >
                <span id="created-at-indicator" title={formatDateTime(activeEntry.createdAt)}>
                  Created at {formatDateTime(activeEntry.createdAt)}
                </span>
                <span>•</span>
                <span id="last-saved-indicator" title={formatDateTime(activeEntry.updatedAt || activeEntry.createdAt)}>
                  Last saved at {formatTimeOnly(activeEntry.updatedAt || activeEntry.createdAt)}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div id="workspace-error-banner" className="px-4 py-2 bg-zinc-100 border-b border-zinc-200 text-zinc-800 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-zinc-700 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  id="retry-save-btn"
                  onClick={() => handleUpdateMetadata({})}
                  className="px-2 py-0.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-md font-medium text-[11px]"
                >
                  Retry Save
                </button>
              </div>
            )}

            {isGuest && (
              <div className="bg-zinc-900 text-zinc-50 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
                <div className="flex items-center space-x-2 text-zinc-300">
                  <Sparkles className="w-4 h-4 text-zinc-400" />
                  <span>You are trying Frankly in guest mode. Want end-to-end zero-knowledge encryption across devices?</span>
                </div>
                <button
                  onClick={() => signInWithGoogle()}
                  className="px-3 py-1.5 rounded-md bg-white text-zinc-900 font-medium hover:bg-zinc-200 transition-colors shrink-0 whitespace-nowrap"
                >
                  Create Encrypted Account
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-[#fafafa]">
              {activeEntry.messages.length === 0 ? (
                <div className="max-w-xl mx-auto text-center py-10">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center mx-auto mb-3.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">Say what you actually think</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    No performance, no filtering, no fear of consequence. Write what is real.
                  </p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {SUGGESTED_STARTERS.map((starter, idx) => (
                      <button
                        key={idx}
                        id={`starter-prompt-btn-${idx}`}
                        type="button"
                        onClick={() => handleSelectStarter(starter)}
                        title="Click to load into editor and customize before sending"
                        className="p-3 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs transition-all duration-150 text-left shadow-2xs flex items-start space-x-2 group cursor-pointer"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5 group-hover:text-zinc-900 transition-colors" />
                        <span className="leading-snug flex-1">{starter}</span>
                        <span className="text-[10px] text-zinc-400 group-hover:text-zinc-700 shrink-0 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Edit
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-5">
                  {activeEntry.messages.map((msg) => (
                    <div key={msg.id} id={`chat-message-${msg.id}`} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center space-x-2 mb-1 px-1">
                        <span className="text-[10px] font-medium text-zinc-400">{msg.role === 'user' ? 'You' : 'WriteFrankly'}</span>
                        {msg.mode && msg.mode !== 'general' && (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/60 capitalize">
                            {msg.mode.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`relative group rounded-2xl p-4 text-sm transition-all duration-150 max-w-[92%] sm:max-w-[85%] ${
                          msg.role === 'user' ? 'bg-zinc-900 text-zinc-50 shadow-2xs rounded-tr-xs' : 'bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs rounded-tl-xs'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{msg.content}</p>
                        ) : (
                          <div className="prose prose-zinc prose-sm max-w-none text-zinc-800 leading-relaxed space-y-2 text-[13px]">
                            <Markdown>{msg.content}</Markdown>
                          </div>
                        )}

                        <button
                          id={`copy-msg-btn-${msg.id}`}
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          title="Copy text"
                          className={`absolute top-2.5 right-2.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                            msg.role === 'user' ? 'text-zinc-400 hover:text-white bg-zinc-800' : 'text-zinc-400 hover:text-zinc-800 bg-zinc-100'
                          }`}
                        >
                          {copiedMessageId === msg.id ? <Check className="w-3 h-3 text-zinc-300" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="flex items-start space-x-2 max-w-[85%]">
                      <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 text-zinc-600 rounded-tl-xs flex items-center space-x-2.5 shadow-2xs">
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-800 animate-spin" />
                        <span className="text-xs font-medium text-zinc-700">Thinking frankly...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="px-4 sm:px-6 pt-2 pb-1.5 bg-white/90 backdrop-blur-xl border-t border-zinc-200/50 shrink-0">
              <div className="max-w-2xl mx-auto flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
                <span className="text-[10px] font-medium text-zinc-400 shrink-0 mr-1">Actions:</span>
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      id={action.id}
                      onClick={() => handleSendPrompt(action.prompt, action.mode)}
                      disabled={isGenerating}
                      className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200/60 transition-colors shrink-0 flex items-center space-x-1 disabled:opacity-40 text-[11px]"
                    >
                      <Icon className="w-3 h-3 text-zinc-600" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Composer */}
            <div className="p-3 sm:p-5 bg-white/90 backdrop-blur-xl border-t border-zinc-200/70 shrink-0">
              {activeEntry.isFinalized ? (
                <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-4 space-y-2 text-center">
                  <p className="text-zinc-600 text-sm font-medium">
                    This journal session has been ended and saved securely.
                  </p>
                  <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
                    <span id="finalized-word-count">{editorWordCount.words.toLocaleString()} words</span>
                    <span>•</span>
                    <span id="finalized-char-count">{editorWordCount.characters.toLocaleString()} characters</span>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto flex flex-col space-y-3">
                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      id="reflection-input-textarea"
                      rows={2}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      onBlur={flushPendingSync}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendPrompt();
                        }
                      }}
                      placeholder="Write frankly without filtering or performance... (Enter to send, Shift+Enter for newline)"
                      className="w-full rounded-2xl bg-zinc-100/80 focus:bg-white border border-zinc-200/80 pl-3.5 pr-12 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all resize-none leading-relaxed"
                    />

                    <button
                      id="send-reflection-btn"
                      onClick={() => handleSendPrompt()}
                      disabled={!promptInput.trim() || isGenerating}
                      aria-label="Send reflection to Gemini"
                      className="absolute right-2.5 bottom-3.5 p-1.5 rounded-full bg-zinc-900 hover:bg-black active:scale-95 text-white disabled:opacity-30 disabled:hover:bg-zinc-900 transition-all duration-150 shadow-2xs cursor-pointer"
                    >
                      {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  
                  {/* Editor Footer: Soft Word & Character Count + End & Save */}
                  <div id="editor-footer-bar" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center flex-wrap gap-2 text-[11px] text-zinc-500">
                      <span id="editor-word-count" className="font-medium text-zinc-600">
                        {editorWordCount.words.toLocaleString()} {editorWordCount.words === 1 ? 'word' : 'words'}
                      </span>
                      <span>•</span>
                      <span id="editor-char-count">
                        {editorWordCount.characters.toLocaleString()} {editorWordCount.characters === 1 ? 'character' : 'characters'}
                      </span>
                      {editorWordCount.words > 5000 && (
                        <span
                          id="word-count-limit-indicator"
                          className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full text-[11px] font-medium animate-in fade-in duration-200"
                        >
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Approaching optimal reflection length.</span>
                        </span>
                      )}
                    </div>
                    <button
                      id="end-and-save-btn"
                      onClick={() => handleUpdateMetadata({ isFinalized: true })}
                      className="px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer self-end sm:self-auto"
                    >
                      End & Save Journal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col bg-[#fafafa]">
            {/* Top Toolbar in Empty State */}
            <div className="h-14 px-4 sm:px-6 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                {onToggleSidebar && (
                  <button
                    id="empty-mobile-sidebar-toggle-btn"
                    onClick={onToggleSidebar}
                    aria-label="Toggle history sidebar"
                    className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100/80 active:bg-zinc-200/70 transition-colors"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                )}
                <span className="text-xs font-medium text-zinc-500">Workspace</span>
              </div>
              <button
                id="empty-checkin-hub-btn"
                onClick={() => {
                  flushPendingSync();
                  setCheckInTargetEntry(null);
                  setIsCheckInHubOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium transition-all duration-200 border border-zinc-200/80 cursor-pointer shadow-2xs"
                title="Open Holistic Check-in Hub"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                <span>Check-in Hub</span>
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="max-w-sm">
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mx-auto mb-3.5 border border-zinc-200/70">
                  <Compass className="w-5 h-5" />
                </div>
                <h2 className="text-base font-semibold text-zinc-900">Welcome to WriteFrankly</h2>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                  Select an entry from your journal history, start a new reflection, or open the Check-in Hub for a holistic debrief.
                </p>
                <div className="mt-5 flex items-center justify-center space-x-2.5">
                  <button
                    id="empty-state-new-entry-btn"
                    onClick={handleCreateNewEntry}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 active:bg-black text-zinc-50 text-xs font-medium shadow-2xs transition-all duration-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Entry</span>
                  </button>
                  <button
                    id="empty-state-checkin-btn"
                    onClick={() => {
                      flushPendingSync();
                      setCheckInTargetEntry(null);
                      setIsCheckInHubOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-800 text-xs font-medium border border-zinc-200/80 shadow-2xs transition-all duration-200 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Check-in Hub</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Independent Global Check-in Hub Modal */}
      {isCheckInHubOpen && (
        <CheckInHub
          entry={checkInTargetEntry}
          recentEntries={entries}
          onClose={() => setIsCheckInHubOpen(false)}
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          userId={user?.uid}
          onSaveMessages={async (newMessages) => {
            if (checkInTargetEntry) {
              const updated = {
                ...checkInTargetEntry,
                messages: newMessages,
                updatedAt: getCurrentTimestamp(),
              };
              if (isGuest) {
                setGuestEntry(updated);
                setEntries((prev) => prev.map((e) => (e.id === checkInTargetEntry.id ? updated : e)));
              } else {
                if (user) await saveJournalEntry(user.uid, updated);
                setEntries((prev) => prev.map((e) => (e.id === checkInTargetEntry.id ? updated : e)));
              }
            }
          }}
          isGuest={isGuest}
        />
      )}

      {/* Customizable AI Personality Settings Modal */}
      {isPersonalitySettingsOpen && (
        <PersonalitySettings
          isOpen={isPersonalitySettingsOpen}
          onClose={() => setIsPersonalitySettingsOpen(false)}
          currentPreferences={preferences}
          onSave={handleUpdatePreferences}
        />
      )}
    </div>
  );
}

