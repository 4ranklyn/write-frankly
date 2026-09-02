'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, LogOut, Plus, PanelLeft } from 'lucide-react';
import Image from 'next/image';

interface NavbarProps {
  onNewEntry: () => void;
  onToggleSidebar?: () => void;
}

export function Navbar({ onNewEntry, onToggleSidebar }: NavbarProps) {
  const { user, signOutUser } = useAuth();

  return (
    <header
      id="main-navbar"
      className="h-14 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between transition-all duration-200"
    >
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            id="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle history sidebar"
            className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100/80 active:bg-zinc-200/70 transition-colors"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-50 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-zinc-100" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold text-zinc-900 text-sm tracking-tight">WriteFrankly</span>
            <span className="hidden sm:inline-block text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200/60">
              private confidant
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {user && (
          <>
            <button
              id="nav-new-entry-btn"
              onClick={onNewEntry}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 active:bg-black text-zinc-50 text-xs font-medium transition-all duration-200 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            <div className="h-4 w-px bg-zinc-200" />

            <div className="flex items-center space-x-2">
              {user.photoURL ? (
                <div className="relative w-7 h-7 rounded-full overflow-hidden border border-zinc-200/80">
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    fill
                    sizes="28px"
                    referrerPolicy="no-referrer"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-medium">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-zinc-900 leading-tight max-w-[130px] truncate">
                  {user.displayName || 'Reflector'}
                </p>
                <p className="text-[10px] text-zinc-400 leading-tight max-w-[130px] truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              id="sign-out-btn"
              onClick={signOutUser}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

