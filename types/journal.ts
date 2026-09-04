export type AIPersonality = 'warm_confidant' | 'pragmatic_coach' | 'stoic_philosopher' | 'socratic_inquirer';

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
