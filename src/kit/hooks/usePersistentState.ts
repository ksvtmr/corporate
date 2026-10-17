import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State persisted in localStorage under a key scoped to the organization, so
 * edits in client-side demo modules survive refreshes and never leak between
 * tenants. Stored values must be language independent (ids and LocalizedText),
 * which keeps them correct after switching the UI language.
 */
export function usePersistentState<T>(key: string, scope: string | undefined, initial: () => T): [T, (updater: T | ((prev: T) => T)) => void] {
  const storageKey = `iclever_demo:${scope || 'anon'}:${key}`;
  const read = useCallback((): T => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // corrupted or unavailable storage → fall back to seed data
    }
    return initial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const [value, setValue] = useState<T>(read);
  const keyRef = useRef(storageKey);

  useEffect(() => {
    if (keyRef.current !== storageKey) {
      keyRef.current = storageKey;
      setValue(read());
    }
  }, [storageKey, read]);

  const update = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        try {
          localStorage.setItem(keyRef.current, JSON.stringify(next));
        } catch {
          // quota exceeded: keep in-memory state
        }
        return next;
      });
    },
    [],
  );

  return [value, update];
}
