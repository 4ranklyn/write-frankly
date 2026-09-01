'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, ShieldCheck, Database, MessageSquareText } from 'lucide-react';

export function LandingPage() {
  const { signInWithGoogle, signInAsGuest, loading, error } = useAuth();

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col justify-between selection:bg-zinc-200 selection:text-zinc-900">
      {/* Top Bar */}
      <header className="px-6 py-4 max-w-6xl mx-auto w-full flex items-center justify-between border-b border-zinc-200/50">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-50 shadow-2xs">
            <Sparkles className="w-4 h-4 text-zinc-100" />
          </div>
          <span className="font-semibold text-base tracking-tight text-zinc-900">
            WriteFrankly
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="landing-guest-header-btn"
            onClick={signInAsGuest}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-zinc-600 hover:text-zinc-900 text-xs font-medium transition-colors cursor-pointer"
          >
            <span>Explore as Guest</span>
          </button>
          <button
            id="landing-header-login-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-zinc-200/80 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-800 text-xs font-medium shadow-2xs transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* Main Hero */}
      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
        {error && (
          <div
            id="auth-error-banner"
            className="mb-8 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs text-left max-w-lg mx-auto flex items-start space-x-3 shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-zinc-900">Authentication Notice</p>
              <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">{error}</p>
              <button
                id="error-guest-fallback-btn"
                onClick={signInAsGuest}
                className="mt-2.5 inline-flex items-center px-3 py-1 rounded-full bg-zinc-900 text-zinc-50 text-[11px] font-medium hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Continue in Guest Mode &rarr;
              </button>
            </div>
          </div>
        )}

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-zinc-700 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
          <span>Private, unvarnished journaling companion</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-950 max-w-2xl mx-auto leading-[1.12]">
          Say the thought out loud. Performative-free.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed">
          A steady, grounded space to think out loud. No therapy-speak, no corporate cheerleading, no moralizing, just honest talk to see your situation clearly.
        </p>

        {/* Primary CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="google-signin-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 active:bg-black text-zinc-50 font-medium text-sm shadow-2xs flex items-center justify-center space-x-2.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {/* Google Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <button
            id="landing-guest-cta-btn"
            onClick={signInAsGuest}
            className="w-full sm:w-auto px-5 py-3 rounded-full bg-white border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 font-medium text-sm shadow-2xs transition-all duration-200 cursor-pointer"
          >
            <span>Continue as Guest</span>
          </button>
        </div>

        <p className="mt-3 text-[11px] text-zinc-400">
          No passwords stored. Secure authentication handled natively by Google&apos;s Firebase.
        </p>

        {/* Feature Grid */}
        <div className="mt-14 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          <div className="p-5 rounded-2xl bg-white border border-zinc-200/70 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-3.5 border border-zinc-200/60">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Zero-Exposure Privacy
            </h3>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              Strict Firestore security rules enforce data isolation. Your unedited, unfiltered thoughts stay strictly yours.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-zinc-200/70 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-3.5 border border-zinc-200/60">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Unvarnished Clarity
            </h3>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              No generic nod-alongs or unearned silver linings. One sharp question at a time that asks what are you looking for.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-zinc-200/70 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-3.5 border border-zinc-200/60">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">
              All-time Recorded
            </h3>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              Continuous Firestore sync ensures your journal history is private, safely stored, and accessible anytime.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 py-5 text-center text-xs text-zinc-400">
        <p>WriteFrankly &bull; A private, unvarnished journaling companion</p>
      </footer>
    </div>
  );
}

