'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            // Check for service worker updates periodically
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    console.log('[PWA] New content available; please refresh.');
                  }
                };
              }
            };
          })
          .catch((error) => {
            console.warn('[PWA] ServiceWorker registration failed:', error);
          });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {children}
      {/* Non-intrusive offline status toast */}
      {!isOnline && (
        <div
          id="pwa-offline-indicator"
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 z-50 flex items-center space-x-2 rounded-xl bg-zinc-900/90 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-zinc-100 shadow-lg border border-zinc-800 transition-all duration-300"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Offline Mode — Reflections stay safe on device</span>
        </div>
      )}
    </>
  );
}
