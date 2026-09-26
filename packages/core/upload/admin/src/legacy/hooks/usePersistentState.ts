import { useEffect, useState } from 'react';

const usePersistentState = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);

    if (stickyValue !== null) {
      try {
        return JSON.parse(stickyValue);
      } catch {
        // JSON.parse fails when the stored value is a primitive
        return stickyValue;
      }
    }

    return defaultValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};

export { usePersistentState };
