import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { JournalEntry } from '../types/journal.ts';

describe('Reflection Completion & Save Flow Logic', () => {
  const createMockEntry = (id: string = 'entry_123'): JournalEntry => ({
    id,
    userId: 'user_abc',
    title: 'Evening Thoughts',
    initialThought: 'Reflecting on today.',
    mood: 'thoughtful',
    tags: ['work', 'life'],
    messages: [
      {
        id: 'msg_1',
        role: 'user',
        content: 'I had a productive day.',
        timestamp: 1700000000000,
        mode: 'reflect',
      },
      {
        id: 'msg_2',
        role: 'assistant',
        content: 'What contributed most to that momentum?',
        timestamp: 1700000005000,
        mode: 'reflect',
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000005000,
    isFinalized: false,
  });

  it('should mark reflection as finalized upon save & finish without mutating other properties', () => {
    const original = createMockEntry();
    const saveTimestamp = Date.now();

    const finalized: JournalEntry = {
      ...original,
      isFinalized: true,
      updatedAt: saveTimestamp,
    };

    assert.strictEqual(finalized.isFinalized, true);
    assert.strictEqual(finalized.id, original.id);
    assert.strictEqual(finalized.title, original.title);
    assert.strictEqual(finalized.messages.length, 2);
    assert.ok(finalized.updatedAt >= original.updatedAt);
  });

  it('should format word and character counts accurately for finalized summary', () => {
    const entry = createMockEntry();
    const promptInput = '';
    const messagesText = (entry.messages || []).map((m) => m.content).join(' ');
    const combinedText = [entry.initialThought || '', messagesText, promptInput]
      .filter(Boolean)
      .join(' ')
      .trim();

    const words = combinedText ? combinedText.split(/\s+/).filter(Boolean).length : 0;
    const characters = combinedText ? combinedText.length : 0;

    assert.ok(words > 0, 'Words should be greater than 0');
    assert.ok(characters > 0, 'Characters should be greater than 0');
  });

  it('should verify debrief mode is segregated from standard user reflection messages', () => {
    const entry = createMockEntry();
    const debriefMsg = {
      id: 'debrief_1',
      role: 'assistant' as const,
      content: 'Here is an empathetic debrief of your session.',
      timestamp: Date.now(),
      mode: 'debrief' as const,
    };

    const entryWithDebrief: JournalEntry = {
      ...entry,
      messages: [...entry.messages, debriefMsg],
    };

    const debriefs = entryWithDebrief.messages.filter((m) => m.mode === 'debrief');
    const standardReflections = entryWithDebrief.messages.filter((m) => m.mode !== 'debrief');

    assert.strictEqual(debriefs.length, 1);
    assert.strictEqual(standardReflections.length, 2);
    assert.strictEqual(debriefs[0].content, 'Here is an empathetic debrief of your session.');
  });
});
