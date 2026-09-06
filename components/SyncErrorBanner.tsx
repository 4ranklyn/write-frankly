'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Loader2, X } from 'lucide-react';
import { formatErrorCopy } from '@/lib/error-formatter';

export interface SyncErrorBannerProps {
  errorMessage: string;
  onRetry: () => Promise<void> | void;
  isRetrying?: boolean;
  onDismiss?: () => void;
  isLocallySaved?: boolean;
}

export function SyncErrorBanner({
  errorMessage,
  onRetry,
  isRetrying = false,
  onDismiss,
  isLocallySaved,
}: SyncErrorBannerProps) {
  const { header, body } = formatErrorCopy(errorMessage, isLocallySaved);

  return (
    <div
      id="workspace-error-banner"
      role="alert"
      aria-live="assertive"
      className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-lg p-3 flex items-center justify-between gap-3 shadow-xs shrink-0 transition-all duration-200"
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1.5 min-w-0">
          <span className="font-semibold text-red-900 dark:text-red-200 text-sm shrink-0">
            {header}:
          </span>
          <span className="text-red-700 dark:text-red-300 text-sm font-medium truncate sm:whitespace-normal">
            {body}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          id="retry-save-btn"
          onClick={onRetry}
          disabled={isRetrying}
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm active:scale-95 disabled:opacity-50 transition-all duration-150 flex items-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
          title="Retry saving reflection to cloud"
        >
          {isRetrying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{isRetrying ? 'Retrying...' : 'Retry Save'}</span>
        </button>

        {onDismiss && (
          <button
            type="button"
            id="dismiss-error-banner-btn"
            onClick={onDismiss}
            aria-label="Dismiss error notice"
            title="Dismiss error notice"
            className="p-1 rounded-md text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
