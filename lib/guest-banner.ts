/**
 * Guest Mode Banner Utilities & Dismissal Threshold Management
 */

export const GUEST_BANNER_STORAGE_KEY = 'frankly_guest_banner_dismissed_at';
export const GUEST_BANNER_FLAG_KEY = 'frankly_guest_banner_dismissed';
export const BANNER_DISMISS_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Checks whether the guest mode banner has been dismissed within the 48-hour re-prompt window.
 */
export function isGuestBannerDismissed(currentTime: number = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const dismissedAt = localStorage.getItem(GUEST_BANNER_STORAGE_KEY);
    if (!dismissedAt) {
      // Also check fallback boolean flag if present
      const flag = localStorage.getItem(GUEST_BANNER_FLAG_KEY);
      return flag === 'true';
    }
    const dismissedTime = parseInt(dismissedAt, 10);
    if (isNaN(dismissedTime)) return false;
    return currentTime - dismissedTime < BANNER_DISMISS_THRESHOLD_MS;
  } catch {
    return false;
  }
}

/**
 * Persists the dismissed state timestamp to localStorage (persisted for 48 hours).
 */
export function dismissGuestBanner(currentTime: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_BANNER_STORAGE_KEY, currentTime.toString());
    localStorage.setItem(GUEST_BANNER_FLAG_KEY, 'true');
  } catch {
    // Graceful degradation when localStorage is unavailable
  }
}
