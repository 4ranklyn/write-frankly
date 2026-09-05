import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatErrorCopy } from '../lib/error-formatter.ts';

describe('Error Formatter & Offline Messaging', () => {
  it('should categorize Firestore/sync error as cloud sync failure with local preservation notice', () => {
    const errorMsg = 'Firestore synchronization error: Failed to fetch';
    const result = formatErrorCopy(errorMsg);

    assert.strictEqual(result.header, 'Cloud sync failed');
    assert.strictEqual(
      result.body,
      'Reflection saved locally on this device, but could not sync to cloud.'
    );
    assert.strictEqual(result.isLocallySaved, true);
  });

  it('should recognize network/offline keywords in error message', () => {
    const errorMsg = 'Network error: client is offline';
    const result = formatErrorCopy(errorMsg);

    assert.strictEqual(result.header, 'Cloud sync failed');
    assert.strictEqual(result.isLocallySaved, true);
  });

  it('should respect explicit isLocallySaved = true flag regardless of message text', () => {
    const errorMsg = 'Quota exceeded';
    const result = formatErrorCopy(errorMsg, true);

    assert.strictEqual(result.header, 'Cloud sync failed');
    assert.strictEqual(result.isLocallySaved, true);
  });

  it('should fallback to generic failure when uncommitted and not a sync issue', () => {
    const errorMsg = 'Invalid authorization token';
    const result = formatErrorCopy(errorMsg, false);

    assert.strictEqual(result.header, 'Failed to save reflection');
    assert.strictEqual(result.body, 'Invalid authorization token');
    assert.strictEqual(result.isLocallySaved, false);
  });

  it('should provide default network message when error body is empty', () => {
    const result = formatErrorCopy('', false);

    assert.strictEqual(result.header, 'Failed to save reflection');
    assert.strictEqual(result.body, 'Network error: Check your connection and try again.');
    assert.strictEqual(result.isLocallySaved, false);
  });
});
