'use client';

import React, { useState, useEffect } from 'react';
import { AIPersonality, UserPreferences } from '@/types/journal';
import {
  X,
  Check,
  Sparkles,
  HeartHandshake,
  Compass,
  Shield,
  HelpCircle,
  Sliders,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export interface PersonalityMeta {
  id: AIPersonality;
  label: string;
  tagline: string;
  description: string;
  badge: string;
  previewQuote: string;
}

export const PERSONALITY_OPTIONS: PersonalityMeta[] = [
  {
    id: 'warm_confidant',
    label: 'Warm Confidant',
    tagline: 'Empathetic, validating, and deeply grounded',
    description:
      'Holds space for your unfiltered thoughts without judgment, clinical detachment, or toxic positivity. Focuses on emotional attunement and safe reflection.',
    badge: 'Default',
    previewQuote:
      '"I hear how much weight you carried today. Let\'s breathe and unpack this without rushing to fix anything."',
  },
  {
    id: 'pragmatic_coach',
    label: 'Pragmatic Coach',
    tagline: 'Direct, actionable, and momentum-focused',
    description:
      'Cuts conversational fluff. Acknowledges the situation in one sentence, challenges hesitation, and focuses relentlessly on personal agency and concrete next steps.',
    badge: 'Action-First',
    previewQuote:
      '"The core bottleneck here is hesitation. What is the single smallest move you can make in the next 15 minutes?"',
  },
  {
    id: 'stoic_philosopher',
    label: 'Stoic Philosopher',
    tagline: 'Equanimity, locus of control, and perspective',
    description:
      'Grounds your thoughts in timeless clarity. Separates what is in your control from what must be accepted, cultivating calm composure and emotional resilience.',
    badge: 'Perspective',
    previewQuote:
      '"You cannot dictate external circumstances, only your judgment of them. What is truly within your power right now?"',
  },
  {
    id: 'socratic_inquirer',
    label: 'Socratic Inquirer',
    tagline: 'Incisive, perceptive, and thought-provoking',
    description:
      'Illuminates cognitive blind spots, hidden premises, and narrative loops. Never hands down answers; asks penetrating questions that guide you to your own truth.',
    badge: 'Deep Inquiry',
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
    currentPreferences.personality || 'warm_confidant'
  );
  const [customTone, setCustomTone] = useState<string>(
    currentPreferences.customToneDirective || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCustomPrompt, setShowCustomPrompt] = useState<boolean>(
    Boolean(currentPreferences.customToneDirective)
  );

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated: UserPreferences = {
        ...currentPreferences,
        personality: selectedPersonality,
        customToneDirective: customTone.trim(),
      };
      await onSave(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to save personality preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setSelectedPersonality('warm_confidant');
    setCustomTone('');
    setShowCustomPrompt(false);
  };

  const renderIcon = (id: AIPersonality) => {
    switch (id) {
      case 'warm_confidant':
        return <HeartHandshake className="w-4 h-4 text-rose-600" />;
      case 'pragmatic_coach':
        return <Compass className="w-4 h-4 text-blue-600" />;
      case 'stoic_philosopher':
        return <Shield className="w-4 h-4 text-amber-600" />;
      case 'socratic_inquirer':
        return <HelpCircle className="w-4 h-4 text-violet-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-zinc-600" />;
    }
  };

  return (
    <div
      id="personality-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="personality-settings-card"
        className="w-full max-w-xl bg-white border border-zinc-200/90 rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-900"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-zinc-100 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
                  Frankly&apos;s Persona & Tone
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200/60 text-zinc-700">
                  AI Companion
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose how Frankly debriefs and reflects with you.
              </p>
            </div>
          </div>
          <button
            id="close-personality-settings-btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close personality settings"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Persona Selection Grid */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-zinc-700 tracking-wide uppercase">
              Core Personality Style
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {PERSONALITY_OPTIONS.map((option) => {
                const isSelected = selectedPersonality === option.id;
                return (
                  <div
                    key={option.id}
                    id={`personality-card-${option.id}`}
                    onClick={() => setSelectedPersonality(option.id)}
                    className={`relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
                      isSelected
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                        : 'bg-zinc-50/50 hover:bg-zinc-100/70 border-zinc-200/80 text-zinc-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-zinc-800 text-white'
                              : 'bg-white border border-zinc-200/70'
                          }`}
                        >
                          {renderIcon(option.id)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold">
                              {option.label}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium ${
                                isSelected
                                  ? 'bg-zinc-800 text-zinc-300'
                                  : 'bg-zinc-200/60 text-zinc-600'
                              }`}
                            >
                              {option.badge}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] font-normal ${
                              isSelected ? 'text-zinc-300' : 'text-zinc-500'
                            }`}
                          >
                            {option.tagline}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          isSelected
                            ? 'bg-white text-zinc-900 border-white'
                            : 'border-zinc-300 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                    </div>

                    <p
                      className={`text-xs mt-2.5 leading-relaxed ${
                        isSelected ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                    >
                      {option.description}
                    </p>

                    {/* Subtle quote sample */}
                    <div
                      className={`mt-2 px-2.5 py-1.5 rounded-lg text-[11px] italic font-serif leading-snug ${
                        isSelected
                          ? 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/50'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200/60'
                      }`}
                    >
                      {option.previewQuote}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Tone Directive Section */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                id="toggle-custom-directive-btn"
                onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                className="flex items-center space-x-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 cursor-pointer"
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
                  onClick={() => setCustomTone('')}
                  className="text-[11px] text-zinc-400 hover:text-zinc-700 flex items-center space-x-1 cursor-pointer"
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
                  placeholder="e.g., 'Keep responses under 3 sentences', 'Be extra candid and ask questions that challenge cognitive bias', 'Use warm conversational tone without bullet points'..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-hidden text-zinc-900 bg-zinc-50/50 resize-none leading-relaxed transition-all"
                  maxLength={500}
                />
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Injected into Frankly&apos;s system guidelines</span>
                  <span>{customTone.length}/500</span>
                </div>

                {/* Quick Suggestion Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED_DIRECTIVES.map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (!customTone.includes(pill)) {
                          setCustomTone((prev) => (prev ? `${prev.trim()}; ${pill}` : pill));
                        }
                      }}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer border border-zinc-200/60"
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
        <div className="px-6 py-3.5 border-t border-zinc-100 bg-zinc-50/60 flex items-center justify-between">
          <button
            type="button"
            id="reset-personality-btn"
            onClick={handleResetToDefault}
            className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              id="cancel-personality-btn"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-personality-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Applied</span>
                </>
              ) : (
                <>
                  <span>{isSaving ? 'Saving...' : 'Apply Tone'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
