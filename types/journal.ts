export type AIPersonality =
  | 'warm_confidant'
  | 'pragmatic_coach'
  | 'stoic_philosopher'
  | 'socratic_inquirer'
  | 'warm-confidant'
  | 'objective-challenger'
  | 'socratic-inquirer';

export function normalizePersonality(val: unknown): 'warm_confidant' | 'pragmatic_coach' | 'stoic_philosopher' | 'socratic_inquirer' {
  if (val === 'objective-challenger' || val === 'pragmatic_coach') return 'pragmatic_coach';
  if (val === 'socratic-inquirer' || val === 'socratic_inquirer') return 'socratic_inquirer';
  if (val === 'stoic_philosopher') return 'stoic_philosopher';
  return 'warm_confidant';
}

export function getPersonaLabel(id?: unknown): string {
  const norm = normalizePersonality(id);
  switch (norm) {
    case 'pragmatic_coach':
      return 'Objective Challenger';
    case 'stoic_philosopher':
      return 'Stoic Philosopher';
    case 'socratic_inquirer':
      return 'Socratic Inquirer';
    case 'warm_confidant':
    default:
      return 'Warm Confidant';
  }
}

export const STARTERS_BY_PERSONALITY: Record<'warm_confidant' | 'pragmatic_coach' | 'stoic_philosopher' | 'socratic_inquirer', string[]> = {
  warm_confidant: [
    'What feelings are sitting just under the surface today?',
    'Where do I need to offer myself a little more grace?',
    'What is the most honest thing I haven\'t said all week?',
    'What drained my energy today, and what restored it?',
  ],
  pragmatic_coach: [
    'What am I avoiding saying out loud about this situation?',
    'Point out where my reasoning or narrative doesn’t quite add up.',
    'Here is what happened — give it to me straight without softening.',
    'What would I do if the excuse I just gave was not an option?',
  ],
  socratic_inquirer: [
    'What assumption am I making that might be completely backwards?',
    'Why do I believe the story I am telling myself right now?',
    'If someone watched my actions without hearing my thoughts, what would they conclude?',
    'What question am I secretly hoping no one asks me?',
  ],
  stoic_philosopher: [
    'What part of this situation is completely outside my control?',
    'How can I turn this obstacle into fuel for clarity?',
    'What is the most composed and virtuous response to this?',
    'A year from now, how much will this moment actually matter?',
  ],
};

export function getStartersForPersonality(personality?: unknown): string[] {
  const norm = normalizePersonality(personality);
  return STARTERS_BY_PERSONALITY[norm] || STARTERS_BY_PERSONALITY.warm_confidant;
}

export interface UserPreferences {
  personality: AIPersonality;
  customToneDirective?: string; // Optional user-written instruction
  emailNotifications?: boolean;
  emailAddress?: string;
  reminderTime?: string;
}

export type EntryMood =
  | 'thoughtful'
  | 'productive'
  | 'grateful'
  | 'stressed'
  | 'inspired'
  | 'neutral'
  | 'curious';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mode?: 'general' | 'reflect' | 'summarize' | 'action_items' | 'reframe' | 'debrief' | 'global_checkin';
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  initialThought: string;
  summary?: string;
  mood: EntryMood;
  tags: string[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isFinalized?: boolean;
  location?: string;
}

export interface JournalEntryDraft {
  title?: string;
  initialThought?: string;
  summary?: string;
  mood?: EntryMood;
  tags?: string[];
  messages?: ChatMessage[];
  location?: string;
  isFinalized?: boolean;
}

export type DecryptedJournalEntry = JournalEntry;
