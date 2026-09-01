import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePayload, scrubPII, sanitizeAndScrubPayload } from '../lib/sanitizer.ts';

describe('Sanitizer Test Suite', () => {
  describe('Payload Hygiene & Undefined-Stripping (sanitizePayload)', () => {
    it('should remove undefined fields from shallow objects', () => {
      const input = {
        title: 'Morning Gratitude',
        tags: ['focus', 'peace'],
        summary: undefined,
        mood: 'calm',
      };
      const result = sanitizePayload(input);

      assert.deepEqual(result, {
        title: 'Morning Gratitude',
        tags: ['focus', 'peace'],
        mood: 'calm',
      });
      assert.strictEqual('summary' in result, false);
    });

    it('should recursively remove undefined values in nested structures', () => {
      const input = {
        id: 'entry-123',
        metadata: {
          location: undefined,
          weather: 'sunny',
          coords: {
            lat: 37.7749,
            lng: undefined,
          },
        },
        draft: undefined,
      };
      const result = sanitizePayload(input);

      assert.deepEqual(result, {
        id: 'entry-123',
        metadata: {
          weather: 'sunny',
          coords: {
            lat: 37.7749,
          },
        },
      });
      assert.strictEqual('draft' in result, false);
      assert.strictEqual('location' in (result.metadata as Record<string, unknown>), false);
      assert.strictEqual('lng' in ((result.metadata as Record<string, unknown>).coords as Record<string, unknown>), false);
    });

    it('should filter undefined elements from arrays', () => {
      const input = ['tag1', undefined, 'tag2', undefined, 'tag3'];
      const result = sanitizePayload(input);
      assert.deepEqual(result, ['tag1', 'tag2', 'tag3']);
    });

    it('should preserve null, empty strings, false, and 0 correctly', () => {
      const input = {
        emptyStr: '',
        nullVal: null,
        zero: 0,
        booleanFalse: false,
        undefinedVal: undefined,
      };
      const result = sanitizePayload(input);

      assert.deepEqual(result, {
        emptyStr: '',
        nullVal: null,
        zero: 0,
        booleanFalse: false,
      });
    });

    it('should return null when input is null or undefined', () => {
      assert.strictEqual(sanitizePayload(null), null);
      assert.strictEqual(sanitizePayload(undefined), null);
    });
  });

  describe('PII Scrubber (scrubPII)', () => {
    it('should redact email addresses', () => {
      const text = 'Contact me at franklin.test@example.com or support@company.org for details.';
      const cleaned = scrubPII(text);
      assert.strictEqual(cleaned, 'Contact me at [EMAIL REDACTED] or [EMAIL REDACTED] for details.');
    });

    it('should redact phone numbers in multiple formats', () => {
      const text = 'Call me at (555) 234-5678 or +1-800-555-0199 tomorrow.';
      const cleaned = scrubPII(text);
      assert.strictEqual(cleaned, 'Call me at [PHONE REDACTED] or [PHONE REDACTED] tomorrow.');
    });

    it('should redact Social Security Numbers', () => {
      const text = 'SSN verification: 000-12-3456 is invalid, but 123-45-6789 should be masked.';
      const cleaned = scrubPII(text);
      assert.ok(cleaned.includes('[SSN REDACTED]'));
      assert.ok(!cleaned.includes('123-45-6789'));
    });

    it('should redact Credit Card numbers', () => {
      const text = 'Payment charged to card 4111 2222 3333 4444 on file.';
      const cleaned = scrubPII(text);
      assert.ok(cleaned.includes('[CREDIT CARD REDACTED]'));
      assert.ok(!cleaned.includes('4111 2222 3333 4444'));
    });

    it('should redact Bearer auth tokens and credentials', () => {
      const text = 'Using Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and secret credentials';
      const cleaned = scrubPII(text);
      assert.ok(cleaned.includes('[TOKEN REDACTED]'));
      assert.ok(!cleaned.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
    });

    it('should preserve standard reflection and journaling prose unaltered', () => {
      const text = 'Today was productive. I walked in Central Park, read 30 pages of Seneca, and felt peaceful.';
      const cleaned = scrubPII(text);
      assert.strictEqual(cleaned, text);
    });
  });

  describe('Combined Payload Sanitation (sanitizeAndScrubPayload)', () => {
    it('should strip undefined and redact PII across entire object hierarchy', () => {
      const input = {
        title: 'Confidential Journal',
        initialThought: 'My secret email is secret@private.io',
        phone: '1-800-555-0199',
        unusedField: undefined,
        tags: ['private', undefined, 'reflection'],
      };

      const result = sanitizeAndScrubPayload(input);
      assert.deepEqual(result, {
        title: 'Confidential Journal',
        initialThought: 'My secret email is [EMAIL REDACTED]',
        phone: '[PHONE REDACTED]',
        tags: ['private', 'reflection'],
      });
      assert.strictEqual('unusedField' in result, false);
    });
  });
});
