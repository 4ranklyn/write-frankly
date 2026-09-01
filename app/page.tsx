'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LandingPage } from '@/components/LandingPage';
import { Navbar } from '@/components/Navbar';
import { Dashboard } from '@/components/Dashboard';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading state during auth check
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-2xs animate-pulse">
          <Sparkles className="w-4 h-4 text-zinc-100" />
        </div>
        <p className="text-xs font-medium text-zinc-500">
          Loading your reflection sanctuary...
        </p>
      </div>
    );
  }

  // If user is not authenticated, display the landing page with Google Sign-In
  if (!user) {
    return <LandingPage />;
  }

  // Authenticated user experience
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-zinc-900 selection:bg-zinc-200 selection:text-zinc-900">
      <Navbar
        onNewEntry={() => {
          const newBtn = document.getElementById('sidebar-new-entry-btn');
          if (newBtn) newBtn.click();
        }}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />
      <Dashboard
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
