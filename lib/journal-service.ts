import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalEntry, ChatMessage } from '@/types/journal';
import { sanitizePayload } from './sanitizer';

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
      (snapshot) => {
        const entries: JournalEntry[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          entries.push({
            id: docSnapshot.id,
            userId: data.userId || userId,
            title: data.title || 'Untitled Reflection',
            initialThought: data.initialThought || '',
            summary: data.summary || '',
            mood: data.mood || 'thoughtful',
            tags: Array.isArray(data.tags) ? data.tags : [],
            messages: Array.isArray(data.messages) ? data.messages : [],
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
          });
        });
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

  const cleanPayload = sanitizePayload({
    ...entry,
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
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    const updateData: Record<string, unknown> = {
      messages,
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
