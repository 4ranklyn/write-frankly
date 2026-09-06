'use client';

import React from 'react';
import { X, ShieldAlert, Sparkles } from 'lucide-react';
import {
  isGuestBannerDismissed,
  dismissGuestBanner,
  GUEST_BANNER_STORAGE_KEY,
  BANNER_DISMISS_THRESHOLD_MS,
} from '@/lib/guest-banner';

export {
  isGuestBannerDismissed,
  dismissGuestBanner,
  GUEST_BANNER_STORAGE_KEY,
  BANNER_DISMISS_THRESHOLD_MS,
};

interface GuestModeBannerProps {
  onSignUp: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function GuestModeBanner({ onSignUp, isOpen = false, onClose }: GuestModeBannerProps) {
  if (!isOpen) {
    return null;
  }

  const handleDismiss = () => {
    dismissGuestBanner();
    if (onClose) onClose();
  };

  return (
    <div
      id="guest-mode-callout-banner"
      role="dialog"
      aria-modal="true"
      aria-label="Guest mode notice"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={handleDismiss}
    >
      <div
        id="guest-mode-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 text-zinc-900 dark:text-zinc-100 animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Local Mode</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Private to this browser</p>
            </div>
          </div>
          <button
            type="button"
            id="dismiss-guest-banner-btn"
            onClick={handleDismiss}
            aria-label="Close guest notice"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-3 leading-relaxed">
          You are in local mode. Create an account to sync your reflections across devices securely.
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              handleDismiss();
              onSignUp();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create an account to sync</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 px-4 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-medium transition-colors cursor-pointer"
          >
            Continue writing locally
          </button>
        </div>
      </div>
    </div>
  );
}
