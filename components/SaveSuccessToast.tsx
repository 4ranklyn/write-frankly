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
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-lg backdrop-blur-md text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-top-2 select-none"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>{message}</span>
      <button
        type="button"
        id="dismiss-save-toast-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Dismiss notification"
        className="p-1 -mr-1 rounded-full text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
