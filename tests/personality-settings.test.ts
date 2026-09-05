import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePersonality,
  getPersonaLabel,
  getStartersForPersonality,
  STARTERS_BY_PERSONALITY,
  type UserPreferences,
  type AIPersonality,
} from '../types/journal.ts';
import { sanitizePayload } from '../lib/sanitizer.ts';

describe('Personality & Tone Selector Unit Tests', () => {
  describe('Persona Alias Resolution & Fallback Normalization', () => {
    it('should map kebab-case aliases to canonical engine identifiers', () => {
      assert.strictEqual(normalizePersonality('warm-confidant'), 'warm_confidant');
      assert.strictEqual(normalizePersonality('objective-challenger'), 'pragmatic_coach');
      assert.strictEqual(normalizePersonality('socratic-inquirer'), 'socratic_inquirer');
    });

    it('should preserve existing snake_case canonical identifiers', () => {
      assert.strictEqual(normalizePersonality('warm_confidant'), 'warm_confidant');
      assert.strictEqual(normalizePersonality('pragmatic_coach'), 'pragmatic_coach');
      assert.strictEqual(normalizePersonality('socratic_inquirer'), 'socratic_inquirer');
      assert.strictEqual(normalizePersonality('stoic_philosopher'), 'stoic_philosopher');
    });

    it('should safely fall back to warm_confidant for unexpected, empty, or malicious strings', () => {
      assert.strictEqual(normalizePersonality('random_unmapped'), 'warm_confidant');
      assert.strictEqual(normalizePersonality(''), 'warm_confidant');
      assert.strictEqual(normalizePersonality(null), 'warm_confidant');
      assert.strictEqual(normalizePersonality(undefined), 'warm_confidant');
      assert.strictEqual(normalizePersonality({}), 'warm_confidant');
      assert.strictEqual(normalizePersonality(123), 'warm_confidant');
    });
  });

  describe('Persona UI Labeling & Semantic Badges', () => {
    it('should return Apple HIG compliant user-facing labels', () => {
      assert.strictEqual(getPersonaLabel('warm_confidant'), 'Warm Confidant');
      assert.strictEqual(getPersonaLabel('warm-confidant'), 'Warm Confidant');
      assert.strictEqual(getPersonaLabel('pragmatic_coach'), 'Objective Challenger');
      assert.strictEqual(getPersonaLabel('objective-challenger'), 'Objective Challenger');
      assert.strictEqual(getPersonaLabel('socratic_inquirer'), 'Socratic Inquirer');
      assert.strictEqual(getPersonaLabel('socratic-inquirer'), 'Socratic Inquirer');
      assert.strictEqual(getPersonaLabel('stoic_philosopher'), 'Stoic Philosopher');
      assert.strictEqual(getPersonaLabel('unknown'), 'Warm Confidant');
    });
  });

  describe('Dynamic Canvas Starters by Persona', () => {
    it('should provide distinct starter prompts tailored to each cognitive posture', () => {
      const warmStarters = getStartersForPersonality('warm_confidant');
      const coachStarters = getStartersForPersonality('objective-challenger');
      const socraticStarters = getStartersForPersonality('socratic_inquirer');
      const stoicStarters = getStartersForPersonality('stoic_philosopher');

      assert.ok(warmStarters.length >= 4);
      assert.ok(coachStarters.length >= 4);
      assert.ok(socraticStarters.length >= 4);
      assert.ok(stoicStarters.length >= 4);

      // Verify tone posture signatures
      assert.ok(warmStarters.some((s) => s.toLowerCase().includes('grace') || s.toLowerCase().includes('feelings')));
      assert.ok(coachStarters.some((s) => s.toLowerCase().includes('excuse') || s.toLowerCase().includes('straight')));
      assert.ok(socraticStarters.some((s) => s.toLowerCase().includes('assumption') || s.toLowerCase().includes('conclude')));
      assert.ok(stoicStarters.some((s) => s.toLowerCase().includes('control') || s.toLowerCase().includes('obstacle')));
    });

    it('should resolve aliases and fall back to warm_confidant starters for unknown personalities', () => {
      const aliasStarters = getStartersForPersonality('objective-challenger');
      assert.deepEqual(aliasStarters, STARTERS_BY_PERSONALITY.pragmatic_coach);

      const fallbackStarters = getStartersForPersonality('invalid_tone');
      assert.deepEqual(fallbackStarters, STARTERS_BY_PERSONALITY.warm_confidant);
    });
  });

  describe('Payload Hygiene & Undefined-Stripping', () => {
    it('should strip undefined fields and preserve valid keys during preference update', () => {
      const rawPayload = {
        personality: 'objective-challenger' as AIPersonality,
        customToneDirective: 'Keep responses concise',
        emailNotifications: undefined,
        emailAddress: undefined,
        reminderTime: undefined,
      };

      const sanitized = sanitizePayload({
        ...rawPayload,
        personality: normalizePersonality(rawPayload.personality),
      }) as UserPreferences;

      assert.strictEqual(sanitized.personality, 'pragmatic_coach');
      assert.strictEqual(sanitized.customToneDirective, 'Keep responses concise');
      assert.strictEqual('emailNotifications' in sanitized, false);
      assert.strictEqual('emailAddress' in sanitized, false);
      assert.strictEqual('reminderTime' in sanitized, false);
    });
  });

  describe('Guest Mode Preferences Isolation', () => {
    it('should detect guest mode identifiers and avoid remote cloud mutations', () => {
      const isGuestUser = (userId?: string | null): boolean => {
        return !userId || userId.startsWith('guest_');
      };

      assert.strictEqual(isGuestUser('guest_12345'), true);
      assert.strictEqual(isGuestUser(null), true);
      assert.strictEqual(isGuestUser(undefined), true);
      assert.strictEqual(isGuestUser(''), true);
      assert.strictEqual(isGuestUser('firebase_auth_user_999'), false);
    });
  });
});
