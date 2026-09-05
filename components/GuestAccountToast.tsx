'use client';

import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface GuestAccountToastProps {
  onSignUp: () => void;
  onClose: () => void;
  message?: string;
  duration?: number;
}

export function GuestAccountToast({
  onSignUp,
  onClose,
  message = 'Entry saved locally. Create an encrypted account to sync across devices',
  duration = 7000,
}: GuestAccountToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <aside
      id="guest-account-toast"
      role="alert"
      aria-live="polite"
      aria-label="Account synchronization prompt"
      className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto bg-zinc-900/95 text-zinc-50 backdrop-blur-md rounded-2xl shadow-xl border border-zinc-800 p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs transition-all duration-200"
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
        </div>
        <p className="text-zinc-200 font-normal leading-snug">
          {message}
        </p>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          id="toast-create-account-btn"
          onClick={() => {
            onClose();
            onSignUp();
          }}
          className="px-2.5 py-1.5 rounded-lg bg-white text-zinc-900 font-medium hover:bg-zinc-200 active:bg-zinc-300 transition-colors whitespace-nowrap text-xs cursor-pointer shadow-2xs"
        >
          Create Account
        </button>
        <button
          type="button"
          id="toast-dismiss-btn"
          onClick={onClose}
          aria-label="Close notification"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
