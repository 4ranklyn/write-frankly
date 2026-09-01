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
  mode?: 'general' | 'reflect' | 'summarize' | 'action_items' | 'reframe';
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
}
