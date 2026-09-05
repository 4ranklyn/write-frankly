'use client';

import React, { useState, useEffect } from 'react';
import { AIPersonality, UserPreferences, normalizePersonality } from '@/types/journal';
import {
  X,
  Check,
  Sparkles,
  HeartHandshake,
  Compass,
  HelpCircle,
  Sliders,
  RotateCcw,
} from 'lucide-react';

export interface PersonalityMeta {
  id: AIPersonality;
  alias?: string;
  label: string;
  tagline: string;
  description: string;
  badge: string;
  previewQuote: string;
}

export const PERSONALITY_OPTIONS: PersonalityMeta[] = [
  {
    id: 'warm_confidant',
    alias: 'warm-confidant',
    label: 'Warm Confidant',
    tagline: 'Empathetic & Grounding',
    description:
      'Offers supportive validation while gently helping you unpack heavy emotions.',
    badge: 'Default',
    previewQuote:
      '"I hear how much weight you carried today. Let\'s breathe and unpack this without rushing to fix anything."',
  },
  {
    id: 'pragmatic_coach',
    alias: 'objective-challenger',
    label: 'Objective Challenger',
    tagline: 'Direct & Razor-Sharp',
    description:
      'Pokes at the edges of your assumptions and cuts through rationalizations.',
    badge: 'Direct',
    previewQuote:
      '"The core bottleneck here is hesitation. What is the single smallest move you can make in the next 15 minutes?"',
  },
  {
    id: 'socratic_inquirer',
    alias: 'socratic-inquirer',
    label: 'Socratic Inquirer',
    tagline: 'Reflective & Probing',
    description:
      'Guides you through targeted questions to let you arrive at your own clarity.',
    badge: 'Probing',
    previewQuote:
      '"You say you wanted that outcome, yet your instinct was to withdraw. What assumption is driving that reaction?"',
  },
];

const SUGGESTED_DIRECTIVES = [
  'Keep responses under 3 sentences',
  'Challenge my assumptions candidly',
  'Ask only one question at a time',
  'Be gentle, today has been overwhelming',
  'Highlight recurring patterns in my habits',
];

interface PersonalitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences: UserPreferences;
  onSave: (preferences: UserPreferences) => Promise<void> | void;
}

export function PersonalitySettings({
  isOpen,
  onClose,
  currentPreferences,
  onSave,
}: PersonalitySettingsProps) {
  const [selectedPersonality, setSelectedPersonality] = useState<AIPersonality>(
    normalizePersonality(currentPreferences.personality)
  );
  const [customTone, setCustomTone] = useState<string>(
    currentPreferences.customToneDirective || ''
  );
  const [showCustomPrompt, setShowCustomPrompt] = useState<boolean>(
    Boolean(currentPreferences.customToneDirective)
  );

  // Sync state if currentPreferences change externally
  useEffect(() => {
    setSelectedPersonality(normalizePersonality(currentPreferences.personality));
    setCustomTone(currentPreferences.customToneDirective || '');
  }, [currentPreferences]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Immediate Direct Application on option click
  const handleSelectPersonality = async (personalityId: AIPersonality) => {
    setSelectedPersonality(personalityId);
    const updated: UserPreferences = {
      ...currentPreferences,
      personality: personalityId,
      customToneDirective: customTone.trim(),
    };
    try {
      await onSave(updated);
    } catch (err) {
      console.error('Failed to save personality preferences:', err);
    }
  };

  const handleCustomToneBlur = async () => {
    const updated: UserPreferences = {
      ...currentPreferences,
      personality: selectedPersonality,
      customToneDirective: customTone.trim(),
    };
    try {
      await onSave(updated);
    } catch (err) {
      console.error('Failed to save custom directive:', err);
    }
  };

  const handleAddDirectivePill = async (pill: string) => {
    if (!customTone.includes(pill)) {
      const newDirective = customTone ? `${customTone.trim()}; ${pill}` : pill;
      setCustomTone(newDirective);
      const updated: UserPreferences = {
        ...currentPreferences,
        personality: selectedPersonality,
        customToneDirective: newDirective.trim(),
      };
      await onSave(updated);
    }
  };

  const handleClearDirectives = async () => {
    setCustomTone('');
    const updated: UserPreferences = {
      ...currentPreferences,
      personality: selectedPersonality,
      customToneDirective: '',
    };
    await onSave(updated);
  };

  const handleResetToDefault = async () => {
    setSelectedPersonality('warm_confidant');
    setCustomTone('');
    setShowCustomPrompt(false);
    const updated: UserPreferences = {
      ...currentPreferences,
      personality: 'warm_confidant',
      customToneDirective: '',
    };
    await onSave(updated);
  };

  const renderIcon = (id: AIPersonality) => {
    const norm = normalizePersonality(id);
    switch (norm) {
      case 'warm_confidant':
        return <HeartHandshake className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'pragmatic_coach':
        return <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'socratic_inquirer':
        return <HelpCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  return (
    <div
      id="personality-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="personality-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="personality-settings-card"
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="personality-settings-title" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Tone & Debrief Style
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Instant Apply
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Choose how Frankly questions, reframes, and debriefs your reflections.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              id="done-personality-settings-btn"
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-colors cursor-pointer min-h-[36px]"
            >
              Done
            </button>
            <button
              id="close-personality-settings-btn"
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close personality settings"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Persona Selection Cards */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide uppercase">
              Core Persona
            </label>
            <div className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-label="Tone personas">
              {PERSONALITY_OPTIONS.map((option) => {
                const normSelected = normalizePersonality(selectedPersonality);
                const normOption = normalizePersonality(option.id);
                const isSelected = normSelected === normOption;

                return (
                  <div
                    key={option.id}
                    id={`personality-card-${option.id}`}
                    data-testid={`personality-card-${option.alias || option.id}`}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => handleSelectPersonality(option.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectPersonality(option.id);
                      }
                    }}
                    className={`relative p-4 rounded-xl border transition-all duration-200 ease-out cursor-pointer text-left min-h-[44px] select-none ${
                      isSelected
                        ? 'ring-2 ring-zinc-900 bg-zinc-50/80 border-zinc-900 dark:ring-white dark:bg-zinc-800/80 dark:border-white shadow-xs'
                        : 'bg-white hover:bg-zinc-50/60 border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-850 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700'
                          }`}
                        >
                          {renderIcon(option.id)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {option.label}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                                isSelected
                                  ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {option.badge}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {option.tagline}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-all duration-200 ${
                          isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white scale-105'
                            : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                    </div>

                    <p className="text-xs mt-2.5 leading-relaxed text-zinc-600 dark:text-zinc-300">
                      {option.description}
                    </p>

                    {/* Preview quote snippet */}
                    <div className="mt-2.5 px-3 py-2 rounded-lg text-[11px] italic font-serif leading-snug bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                      {option.previewQuote}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Tone Directive Section */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                id="toggle-custom-directive-btn"
                onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                className="flex items-center space-x-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                <span>Custom Directives for Frankly</span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  {showCustomPrompt ? '(Click to collapse)' : '(Optional instructions)'}
                </span>
              </button>

              {customTone && (
                <button
                  type="button"
                  onClick={handleClearDirectives}
                  className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center space-x-1 cursor-pointer"
                  title="Clear custom directives"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {showCustomPrompt && (
              <div className="space-y-2 mt-2">
                <textarea
                  id="custom-tone-directive-input"
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  onBlur={handleCustomToneBlur}
                  placeholder="e.g., 'Keep responses under 3 sentences', 'Be extra candid and challenge cognitive bias', 'Use warm conversational tone without bullet points'..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 focus:outline-hidden text-zinc-900 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/50 resize-none leading-relaxed transition-all"
                  maxLength={500}
                />
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Automatically saved on focus change</span>
                  <span>{customTone.length}/500</span>
                </div>

                {/* Quick Suggestion Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED_DIRECTIVES.map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddDirectivePill(pill)}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
                    >
                      + {pill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 flex items-center justify-between">
          <button
            type="button"
            id="reset-personality-btn"
            onClick={handleResetToDefault}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            id="save-personality-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-xs transition-colors cursor-pointer min-h-[36px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
