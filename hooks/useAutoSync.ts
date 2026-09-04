import { useEffect, useRef, useCallback } from 'react';

export function useAutoSync(
  syncFunction: () => Promise<void>,
  delay: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncFuncRef = useRef(syncFunction);

  useEffect(() => {
    syncFuncRef.current = syncFunction;
  }, [syncFunction]);

  const scheduleSync = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      syncFuncRef.current();
    }, delay);
  }, [delay]);

  const flushPendingSync = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      syncFuncRef.current();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // We shouldn't call sync on unmount because state might be stale
        // or we use beforeunload for tab close
      }
    };
  }, []);

  return { scheduleSync, flushPendingSync };
}
