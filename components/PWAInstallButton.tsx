'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'sidebar' | 'pill' | 'minimal';
}

export function PWAInstallButton({
  className = '',
  variant = 'sidebar',
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running inside standalone PWA mode, suppress install button
  if (isStandalone || isInstalled) {
    return null;
  }

  // Neither installable yet nor iOS Safari -> hide
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'sidebar' && (
        <button
          id="pwa-install-sidebar-btn"
          type="button"
          onClick={handleInstallClick}
          className={`w-full px-2.5 py-1.5 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 text-xs font-medium flex items-center justify-between transition-colors shadow-2xs cursor-pointer ${className}`}
          title="Install Frankly as a standalone app"
        >
          <div className="flex items-center space-x-2">
            <Download className="w-3.5 h-3.5 text-zinc-700" />
            <span>Install App</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-normal">PWA</span>
        </button>
      )}

      {variant === 'pill' && (
        <button
          id="pwa-install-pill-btn"
          type="button"
          onClick={handleInstallClick}
          className={`px-3 py-1.5 rounded-full border border-zinc-200/90 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-medium flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer shrink-0 ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-zinc-600" />
          <span>Install Frankly</span>
        </button>
      )}

      {variant === 'minimal' && (
        <button
          id="pwa-install-minimal-btn"
          type="button"
          onClick={handleInstallClick}
          className={`p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer ${className}`}
          title="Install Write Frankly"
          aria-label="Install Write Frankly App"
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {/* iOS Safari Home Screen Instructions Modal */}
      {showIOSModal && (
        <div
          id="pwa-ios-instructions-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200/80 text-left relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                  F
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Install Frankly</h3>
                  <p className="text-[11px] text-zinc-500">Add to iPhone or iPad Home Screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-zinc-600">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 font-medium text-[11px]">
                  1
                </div>
                <div className="leading-relaxed">
                  Tap the <strong className="text-zinc-900 font-semibold">Share</strong> button <Share className="w-3.5 h-3.5 inline-block text-zinc-800 -mt-0.5" /> in the Safari toolbar at the bottom of the screen.
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 font-medium text-[11px]">
                  2
                </div>
                <div className="leading-relaxed">
                  Scroll down the menu and tap <strong className="text-zinc-900 font-semibold">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline-block text-zinc-800 -mt-0.5" />.
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 font-medium text-[11px]">
                  3
                </div>
                <div className="leading-relaxed">
                  Tap <strong className="text-zinc-900 font-semibold">Add</strong> in the top right corner to launch Frankly in standalone fullscreen mode.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
