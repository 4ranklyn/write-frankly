'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SaveSuccessToastProps {
  message?: string;
  onClose: () => void;
  duration?: number;
}

export function SaveSuccessToast({
  message = '✓ Reflection saved securely',
  onClose,
  duration = 3500,
}: SaveSuccessToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      id="save-success-toast"
      role="status"
      aria-live="polite"
      onClick={onClose}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 dark:bg-zinc-100/95 text-zinc-100 dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200/80 px-4 py-2 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-bottom-3 select-none"
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
      <span className="truncate max-w-[240px] sm:max-w-xs">{message}</span>
      <button
        type="button"
        id="dismiss-save-toast-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Dismiss notification"
        className="p-0.5 -mr-1 rounded-full text-zinc-400 hover:text-zinc-200 dark:hover:text-zinc-800 transition-colors cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
