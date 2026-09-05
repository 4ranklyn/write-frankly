/**
 * Guest Mode Banner Utilities & Dismissal Threshold Management
 */

export const GUEST_BANNER_STORAGE_KEY = 'frankly_guest_banner_dismissed_at';
export const BANNER_DISMISS_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Checks whether the guest mode banner has been dismissed within the 24-hour re-prompt window.
 */
export function isGuestBannerDismissed(currentTime: number = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const dismissedAt = localStorage.getItem(GUEST_BANNER_STORAGE_KEY);
    if (!dismissedAt) return false;
    const dismissedTime = parseInt(dismissedAt, 10);
    if (isNaN(dismissedTime)) return false;
    return currentTime - dismissedTime < BANNER_DISMISS_THRESHOLD_MS;
  } catch {
    return false;
  }
}

/**
 * Persists the dismissed state timestamp to localStorage.
 */
export function dismissGuestBanner(currentTime: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_BANNER_STORAGE_KEY, currentTime.toString());
  } catch {
    // Graceful degradation when localStorage is unavailable
  }
}
