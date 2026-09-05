'use client';

import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
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
      className="px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border-b border-red-300 dark:border-red-800 text-red-900 dark:text-red-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs shrink-0 transition-all duration-200"
    >
      <div className="flex items-start sm:items-center space-x-2.5 min-w-0">
        <div className="p-1 rounded-md bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 shrink-0 mt-0.5 sm:mt-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1.5 min-w-0">
          <span className="font-semibold text-red-900 dark:text-red-200 shrink-0">
            {header}:
          </span>
          <span className="text-red-800 dark:text-red-300 truncate sm:whitespace-normal">
            {body}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
        <button
          type="button"
          id="retry-save-btn"
          onClick={onRetry}
          disabled={isRetrying}
          className="min-h-[40px] px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-all duration-150 flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:cursor-not-allowed"
          title="Retry saving reflection to cloud"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Retry Save'}</span>
        </button>

        {onDismiss && (
          <button
            type="button"
            id="dismiss-error-banner-btn"
            onClick={onDismiss}
            aria-label="Dismiss error notice"
            title="Dismiss error notice"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
