'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  signOutUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedGuest = typeof window !== 'undefined' ? localStorage.getItem('reflect_guest_user') : null;

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            isAnonymous: false,
          });
        } else if (savedGuest) {
          try {
            setUser(JSON.parse(savedGuest));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firebase auth state error:', err);
        if (savedGuest) {
          try {
            setUser(JSON.parse(savedGuest));
          } catch {
            setUser(null);
          }
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('reflect_guest_user');
      }
      if (cred.user) {
        setUser({
          uid: cred.user.uid,
          displayName: cred.user.displayName,
          email: cred.user.email,
          photoURL: cred.user.photoURL,
          isAnonymous: false,
        });
      }
      setLoading(false);
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      console.error('Google Sign-In error:', err);
      if (errObj.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        return;
      }
      if (
        errObj.code?.includes('requests-from-referer') ||
        errObj.message?.includes('requests-from-referer')
      ) {
        setError(
          'Google Sign-In is currently blocked by API Key HTTP referer restrictions for this Cloud Run preview URL. You can continue as a Guest, or authorize this domain in your Google Cloud Console API Key settings.'
        );
      } else {
        setError(
          errObj.message ||
            'Failed to connect with Google. You can continue as a Guest to use all reflection features.'
        );
      }
      setLoading(false);
    }
  };

  const signInAsGuest = () => {
    setError(null);
    let guestId = typeof window !== 'undefined' ? localStorage.getItem('reflect_guest_id') : null;
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
      if (typeof window !== 'undefined') {
        localStorage.setItem('reflect_guest_id', guestId);
      }
    }
    const guestUser: AppUser = {
      uid: guestId,
      displayName: 'Guest Explorer',
      email: 'guest@reflect.local',
      photoURL: null,
      isAnonymous: true,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('reflect_guest_user', JSON.stringify(guestUser));
    }
    setUser(guestUser);
  };

  const signOutUser = async () => {
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reflect_guest_user');
    }
    try {
      await fbSignOut(auth);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      console.error('Sign Out error:', err);
    }
    setUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInAsGuest,
        signOutUser,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
