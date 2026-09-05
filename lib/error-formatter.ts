/**
 * Error formatting utility for classifying and copy-crafting save and sync errors.
 */

export interface ErrorCopy {
  header: string;
  body: string;
  isLocallySaved: boolean;
}

export function formatErrorCopy(errorMessage: string, isLocallySaved?: boolean): ErrorCopy {
  const isSyncOrNetwork =
    isLocallySaved ??
    /sync|firestore|network|fetch|offline|connection/i.test(errorMessage);

  if (isSyncOrNetwork) {
    return {
      header: 'Cloud sync failed',
      body: 'Reflection saved locally on this device, but could not sync to cloud.',
      isLocallySaved: true,
    };
  }

  return {
    header: 'Failed to save reflection',
    body: errorMessage || 'Network error: Check your connection and try again.',
    isLocallySaved: false,
  };
}
