import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce rapidly changing values (e.g. search query inputs).
 * Prevents redundant re-renders and network request flooding during typing.
 *
 * @param value The value to debounce
 * @param delayMs Delay in milliseconds (default: 300ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
