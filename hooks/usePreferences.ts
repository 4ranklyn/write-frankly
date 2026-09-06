'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { UserPreferences, normalizePersonality } from '@/types/journal';
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
export type ValidTonePersona = 'warm-confidant' | 'objective-challenger' | 'socratic-inquirer';

export function validateTonePersona(val: unknown): AIPersonality {
  if (val === 'warm-confidant' || val === 'warm_confidant') return 'warm_confidant';
  if (val === 'objective-challenger' || val === 'pragmatic_coach') return 'pragmatic_coach';
  if (val === 'socratic-inquirer' || val === 'socratic_inquirer') return 'socratic_inquirer';
  return 'warm_confidant';
}

function sanitizeAndFilterPreferences(raw: Partial<UserPreferences>): UserPreferences {
  const personality = validateTonePersona(raw?.personality);
  const customToneDirective = typeof raw?.customToneDirective === 'string'
    ? raw.customToneDirective.trim().slice(0, 500)
    : '';

  const clean: UserPreferences = {
    personality,
    customToneDirective,
  };

  if (typeof raw?.emailNotifications === 'boolean') {
    clean.emailNotifications = raw.emailNotifications;
  }
  if (typeof raw?.emailAddress === 'string') {
    clean.emailAddress = raw.emailAddress.trim().slice(0, 150);
  }
  if (typeof raw?.reminderTime === 'string') {
    clean.reminderTime = raw.reminderTime.trim().slice(0, 10);
  }

  // Zero-crash undefined stripping
  return JSON.parse(JSON.stringify(clean));
}

export function usePreferences() {
  const { user } = useAuth();
  const isGuest = !user || !user.uid || user.uid.startsWith('guest_') || Boolean(user.isAnonymous);

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const initial = loadLocalPreferences(user?.uid);
    return sanitizeAndFilterPreferences(initial);
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const syncPreferences = async () => {
      // Guard the Client Fetch: In your preferences hook/service, skip calling Firestore when in guest mode or when auth.currentUser is null:
      if (!auth.currentUser || isGuest) {
        // Load directly from localStorage, do not query Firestore
        const local = loadLocalPreferences(user?.uid);
        if (isMounted) {
          setPreferences(sanitizeAndFilterPreferences(local));
        }
        return;
      }

      setLoading(true);
      try {
        const remote = await loadUserPreferences(user?.uid);
        if (isMounted && remote) {
          setPreferences(sanitizeAndFilterPreferences(remote));
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
      const sanitizedPrefs = sanitizeAndFilterPreferences(newPrefs);
      setPreferences(sanitizedPrefs);
      if (user?.uid) {
        await saveUserPreferences(user.uid, sanitizedPrefs);
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
