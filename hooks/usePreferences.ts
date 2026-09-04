'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { UserPreferences } from '@/types/journal';
import {
  loadUserPreferences,
  saveUserPreferences,
  loadLocalPreferences,
} from '@/lib/journal-service';

/**
 * Custom hook providing guarded user preference synchronization.
 * When in guest mode or unauthenticated, it strictly loads and persists
 * directly to localStorage without querying or mutating Cloud Firestore.
 */
export function usePreferences() {
  const { user } = useAuth();
  const isGuest = !user || !user.uid || user.uid.startsWith('guest_') || Boolean(user.isAnonymous);

  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadLocalPreferences(user?.uid)
  );
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const syncPreferences = async () => {
      // Guard the Client Fetch: In your preferences hook/service, skip calling Firestore when in guest mode or when auth.currentUser is null:
      if (!auth.currentUser || isGuest) {
        // Load directly from localStorage, do not query Firestore
        const local = loadLocalPreferences(user?.uid);
        if (isMounted) {
          setPreferences(local);
        }
        return;
      }

      setLoading(true);
      try {
        const remote = await loadUserPreferences(user?.uid);
        if (isMounted && remote) {
          setPreferences(remote);
        }
      } catch (err) {
        console.warn('Preferences fetch error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    syncPreferences();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, isGuest]);

  const updatePreferences = useCallback(
    async (newPrefs: UserPreferences) => {
      setPreferences(newPrefs);
      if (user?.uid) {
        await saveUserPreferences(user.uid, newPrefs);
      }
    },
    [user]
  );

  return {
    preferences,
    updatePreferences,
    loading,
    isGuest,
  };
}
