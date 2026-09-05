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
      className="h-[34px] px-3 sm:px-4 bg-zinc-100/90 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 flex items-center justify-between text-xs transition-all duration-150 shrink-0 select-none"
    >
      <div className="flex items-center space-x-2 min-w-0 truncate text-xs">
        <span className="font-medium text-zinc-800 dark:text-zinc-200 shrink-0">
          Guest Mode (Local Only)
        </span>
        <span className="text-zinc-400 dark:text-zinc-500 select-none">•</span>
        <button
          type="button"
          onClick={onSignUp}
          className="font-medium text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:text-black dark:hover:text-white transition-colors shrink-0 whitespace-nowrap cursor-pointer"
        >
          Create Account →
        </button>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
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
