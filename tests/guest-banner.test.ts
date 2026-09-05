import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_BANNER_STORAGE_KEY,
  BANNER_DISMISS_THRESHOLD_MS,
  isGuestBannerDismissed,
  dismissGuestBanner,
} from '../lib/guest-banner.ts';

describe('GuestModeBanner Logic & Dismissal Persistence', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    // Mock global window and localStorage for node test runner
    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: Object.keys(store).length,
    };
  });

  it('should have correct storage key and 48h threshold', () => {
    assert.strictEqual(GUEST_BANNER_STORAGE_KEY, 'frankly_guest_banner_dismissed_at');
    assert.strictEqual(BANNER_DISMISS_THRESHOLD_MS, 48 * 60 * 60 * 1000);
  });

  it('should return false when banner has never been dismissed', () => {
    assert.strictEqual(isGuestBannerDismissed(), false);
  });

  it('should return true immediately after dismissing the banner', () => {
    const now = 1700000000000;
    dismissGuestBanner(now);
    assert.strictEqual(store[GUEST_BANNER_STORAGE_KEY], now.toString());
    assert.strictEqual(store['frankly_guest_banner_dismissed'], 'true');
    assert.strictEqual(isGuestBannerDismissed(now), true);
    assert.strictEqual(isGuestBannerDismissed(now + 1000), true);
  });

  it('should return true when dismissed within the 48h window', () => {
    const now = 1700000000000;
    dismissGuestBanner(now);
    // 47 hours later
    const fortySevenHoursLater = now + 47 * 60 * 60 * 1000;
    assert.strictEqual(isGuestBannerDismissed(fortySevenHoursLater), true);
  });

  it('should return false (re-prompt) when 48h threshold has expired', () => {
    const now = 1700000000000;
    dismissGuestBanner(now);
    // 48 hours and 1 minute later
    const expiredTime = now + (48 * 60 * 60 * 1000) + 60000;
    assert.strictEqual(isGuestBannerDismissed(expiredTime), false);
  });

  it('should support frankly_guest_banner_dismissed boolean flag in localStorage', () => {
    store['frankly_guest_banner_dismissed'] = 'true';
    assert.strictEqual(isGuestBannerDismissed(), true);
  });

  it('should handle corrupted or non-numeric timestamps gracefully', () => {
    store[GUEST_BANNER_STORAGE_KEY] = 'invalid-timestamp-xyz';
    assert.strictEqual(isGuestBannerDismissed(), false);
  });
});
