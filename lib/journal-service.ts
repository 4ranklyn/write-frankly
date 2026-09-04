import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalEntry, ChatMessage, UserPreferences, AIPersonality } from '@/types/journal';
import { sanitizePayload } from './sanitizer';
import { deriveKeyFromPassphrase, encryptText, decryptText, EncryptedPayload } from './crypto';

const STATIC_APP_SECRET = "ai-studio-journal-secure-salt-v1";

async function computeDeterministicSalt(userId: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const data = enc.encode(userId + STATIC_APP_SECRET);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

let cachedKey: CryptoKey | null = null;
async function getEncryptionKey(userId: string): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const salt = await computeDeterministicSalt(userId);
  cachedKey = await deriveKeyFromPassphrase(userId, salt);
  return cachedKey;
}

async function encryptString(text: string, userId: string): Promise<string> {
  if (!text) return text;
  try {
    const key = await getEncryptionKey(userId);
    const enc = await encryptText(text, key);
    return `ENC:${JSON.stringify(enc)}`;
  } catch (err) {
    console.warn("Encryption failed, falling back to plaintext", err);
    return text;
  }
}

async function decryptString(text: string, userId: string): Promise<string> {
  if (!text || !text.startsWith('ENC:')) return text;
  try {
    const payload = JSON.parse(text.slice(4)) as EncryptedPayload;
    const key = await getEncryptionKey(userId);
    return await decryptText(payload.ciphertext, payload.iv, key);
  } catch (err) {
    console.warn("Decryption failed", err);
    return "[[Decryption Failed]]";
  }
}

function getLocalEntries(userId: string): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`reflect_entries_${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalEntries(userId: string, entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`reflect_entries_${userId}`, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

/**
 * Subscribes to realtime updates of all journal entries for an authenticated user.
 * Isolated strictly to /users/{userId}/entries.
 */
export function subscribeToUserEntries(
  userId: string,
  onData: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }

  // If guest mode, serve from localStorage
  if (userId.startsWith('guest_')) {
    const loadGuest = () => {
      const list = getLocalEntries(userId).sort((a, b) => b.updatedAt - a.updatedAt);
      onData(list);
    };
    loadGuest();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `reflect_entries_${userId}`) {
        loadGuest();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  try {
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(entriesRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(
      q,
      async (snapshot) => {
        const entries: JournalEntry[] = [];
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          const rawMessages = Array.isArray(data.messages) ? data.messages : [];
          
          // Decrypt messages on the fly
          const decryptedMessages = await Promise.all(
            rawMessages.map(async (msg: any) => ({
              ...msg,
              content: await decryptString(msg.content, userId),
            }))
          );

          entries.push({
            id: docSnapshot.id,
            userId: data.userId || userId,
            title: (data.title === 'Untitled Reflection' || !data.title) ? '' : data.title,
            initialThought: data.initialThought || '',
            summary: data.summary || '',
            mood: data.mood || 'thoughtful',
            tags: Array.isArray(data.tags) ? data.tags : [],
            messages: decryptedMessages,
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
            isFinalized: data.isFinalized || false,
          });
        }
        onData(entries);
      },
      (err) => {
        console.error('Error fetching Firestore user entries:', err);
        // Fallback to local storage on Firestore permissions error
        const list = getLocalEntries(userId).sort((a, b) => b.updatedAt - a.updatedAt);
        onData(list);
        onError(err);
      }
    );
  } catch (err: unknown) {
    console.error('Firestore init error:', err);
    const list = getLocalEntries(userId);
    onData(list);
    return () => {};
  }
}

/**
 * Saves or updates a journal entry in Firestore with guaranteed undefined-stripping.
 */
export async function saveJournalEntry(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  if (!userId || !entry.id) {
    throw new Error('User ID and Entry ID are required to save');
  }

  // Encrypt all messages before hitting the database
  const encryptedMessages = await Promise.all(
    (entry.messages || []).map(async (msg) => ({
      ...msg,
      content: await encryptString(msg.content, userId),
    }))
  );

  const cleanPayload = sanitizePayload({
    ...entry,
    messages: encryptedMessages,
    userId,
    updatedAt: Date.now(),
  }) as JournalEntry;

  // Always keep local mirror updated
  const localList = getLocalEntries(userId);
  const existingIdx = localList.findIndex((item) => item.id === entry.id);
  if (existingIdx >= 0) {
    localList[existingIdx] = cleanPayload;
  } else {
    localList.unshift(cleanPayload);
  }
  saveLocalEntries(userId, localList);

  if (userId.startsWith('guest_')) {
    return;
  }

  try {
    const entryRef = doc(db, 'users', userId, 'entries', entry.id);
    await setDoc(entryRef, cleanPayload, { merge: true });
  } catch (err) {
    console.warn('Firestore setDoc notice (saved locally):', err);
  }
}

/**
 * Appends messages or updates summary of an existing journal entry.
 */
export async function updateEntryMessages(
  userId: string,
  entryId: string,
  messages: ChatMessage[],
  summary?: string
): Promise<void> {
  if (!userId || !entryId) {
    throw new Error('User ID and Entry ID are required to update messages');
  }

  const localList = getLocalEntries(userId);
  const target = localList.find((item) => item.id === entryId);
  if (target) {
    target.messages = messages;
    target.updatedAt = Date.now();
    if (summary !== undefined) {
      target.summary = summary;
    }
    saveLocalEntries(userId, localList);
  }

  if (userId.startsWith('guest_')) {
    return;
  }

  try {
    const encryptedMessages = await Promise.all(
      messages.map(async (msg) => ({
        ...msg,
        content: await encryptString(msg.content, userId),
      }))
    );

    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    const updateData: Record<string, unknown> = {
      messages: encryptedMessages,
      updatedAt: Date.now(),
    };

    if (summary !== undefined) {
      updateData.summary = summary;
    }

    const cleanPayload = sanitizePayload(updateData);
    await updateDoc(entryRef, cleanPayload);
  } catch (err) {
    console.warn('Firestore updateDoc notice (updated locally):', err);
  }
}

/**
 * Deletes a journal entry from Firestore / local storage.
 */
export async function deleteJournalEntry(
  userId: string,
  entryId: string
): Promise<void> {
  if (!userId || !entryId) {
    throw new Error('User ID and Entry ID are required for deletion');
  }

  const localList = getLocalEntries(userId).filter((item) => item.id !== entryId);
  saveLocalEntries(userId, localList);

  if (userId.startsWith('guest_')) {
    return;
  }

  try {
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    await deleteDoc(entryRef);
  } catch (err) {
    console.warn('Firestore deleteDoc notice (removed locally):', err);
  }
}

const VALID_PERSONALITIES: AIPersonality[] = [
  'warm_confidant',
  'pragmatic_coach',
  'stoic_philosopher',
  'socratic_inquirer',
];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  personality: 'warm_confidant',
  customToneDirective: '',
  emailNotifications: false,
};

/**
 * Retrieves user preferences from localStorage (fast sync) and falls back to defaults.
 */
export function getStoredUserPreferences(userId?: string): UserPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_USER_PREFERENCES };
  try {
    const key = userId ? `frankly_prefs_${userId}` : 'frankly_prefs_global';
    const raw = localStorage.getItem(key) || localStorage.getItem('frankly_prefs_global');
    if (raw) {
      const parsed = JSON.parse(raw);
      const personality: AIPersonality = VALID_PERSONALITIES.includes(parsed.personality)
        ? parsed.personality
        : 'warm_confidant';
      return {
        personality,
        customToneDirective: typeof parsed.customToneDirective === 'string' ? parsed.customToneDirective : '',
        emailNotifications: Boolean(parsed.emailNotifications),
        emailAddress: typeof parsed.emailAddress === 'string' ? parsed.emailAddress : '',
        reminderTime: typeof parsed.reminderTime === 'string' ? parsed.reminderTime : '',
      };
    }
  } catch (err) {
    console.warn('Error reading stored user preferences:', err);
  }
  return { ...DEFAULT_USER_PREFERENCES };
}

/**
 * Loads preferences from Firestore if available, otherwise returns local/default.
 */
export async function loadUserPreferences(userId: string): Promise<UserPreferences> {
  const local = getStoredUserPreferences(userId);
  if (!userId || userId.startsWith('guest_')) {
    return local;
  }

  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      const data = snap.data();
      const personality: AIPersonality = VALID_PERSONALITIES.includes(data.personality)
        ? data.personality
        : local.personality;
      const remotePrefs: UserPreferences = {
        personality,
        customToneDirective: typeof data.customToneDirective === 'string' ? data.customToneDirective : local.customToneDirective,
        emailNotifications: data.emailNotifications ?? local.emailNotifications,
        emailAddress: data.emailAddress ?? local.emailAddress,
        reminderTime: data.reminderTime ?? local.reminderTime,
      };
      // Keep local mirrors in sync
      if (typeof window !== 'undefined') {
        localStorage.setItem(`frankly_prefs_${userId}`, JSON.stringify(remotePrefs));
        localStorage.setItem('frankly_prefs_global', JSON.stringify(remotePrefs));
      }
      return remotePrefs;
    }
  } catch (err) {
    console.warn('Firestore loadUserPreferences notice (using local):', err);
  }
  return local;
}

/**
 * Saves user preferences to both localStorage and Firestore.
 */
export async function saveUserPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  const sanitized = sanitizePayload({
    ...prefs,
    personality: VALID_PERSONALITIES.includes(prefs.personality) ? prefs.personality : 'warm_confidant',
    customToneDirective: prefs.customToneDirective || '',
  }) as UserPreferences;

  if (typeof window !== 'undefined') {
    try {
      if (userId) {
        localStorage.setItem(`frankly_prefs_${userId}`, JSON.stringify(sanitized));
      }
      localStorage.setItem('frankly_prefs_global', JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Local preference storage error:', e);
    }
  }

  if (!userId || userId.startsWith('guest_')) {
    return;
  }

  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(settingsRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore saveUserPreferences notice (persisted locally):', err);
  }
}
