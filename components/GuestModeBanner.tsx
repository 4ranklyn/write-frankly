'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
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
}

export function GuestModeBanner({ onSignUp }: GuestModeBannerProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // Check local storage persistence on mount
    const dismissed = isGuestBannerDismissed();
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    dismissGuestBanner();
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      id="guest-mode-callout-banner"
      role="region"
      aria-label="Guest mode notice"
      className="h-9 sm:h-10 px-3 sm:px-4 bg-zinc-100/75 dark:bg-zinc-800/40 border-b border-zinc-200/70 dark:border-zinc-800/60 text-zinc-600 dark:text-zinc-300 flex items-center justify-between text-xs transition-all duration-150 shrink-0 select-none"
    >
      {/* Mobile condensed layout (< md): compact single line <= 40px */}
      <div className="flex md:hidden items-center space-x-1.5 min-w-0 truncate text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-200 shrink-0">
          Guest Mode (Local Only)
        </span>
        <span className="text-zinc-400 dark:text-zinc-500 select-none">•</span>
        <button
          type="button"
          onClick={onSignUp}
          className="font-medium text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:text-black dark:hover:text-white transition-colors shrink-0 whitespace-nowrap cursor-pointer"
        >
          Secure Account →
        </button>
      </div>

      {/* Desktop layout (>= md) */}
      <div className="hidden md:flex items-center space-x-2 text-zinc-600 dark:text-zinc-300">
        <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
        <span>
          You are trying Frankly in guest mode. Want end-to-end zero-knowledge encryption across devices?
        </span>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <div className="hidden md:block">
          <button
            type="button"
            onClick={onSignUp}
            className="px-2.5 py-1 rounded-md bg-zinc-900 dark:bg-zinc-100 hover:bg-black dark:hover:bg-white text-white dark:text-zinc-900 font-medium transition-colors shrink-0 whitespace-nowrap text-[11px] cursor-pointer shadow-2xs"
          >
            Create Encrypted Account
          </button>
        </div>

        {/* Dismiss button with min 44x44px accessible touch target */}
        <button
          type="button"
          id="dismiss-guest-banner-btn"
          onClick={handleDismiss}
          aria-label="Dismiss guest mode banner"
          title="Dismiss banner"
          className="relative min-w-[44px] min-h-[44px] -my-2 -mr-2 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 active:scale-95 transition-all cursor-pointer rounded-full"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
