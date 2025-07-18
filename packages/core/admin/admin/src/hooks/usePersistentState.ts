import { useEffect, useState } from 'react';

import { useInitQuery } from '../services/admin';

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

// Same as usePersistentState, but scoped to the current instance of Strapi
// useful for storing state that should not be shared across different instances of Strapi running on localhost
const useScopedPersistentState = <T>(key: string, defaultValue: T) => {
  const { data: initData } = useInitQuery();
  const { uuid } = initData ?? {};

  const namespacedKey = `${key}:${uuid}`;
  return usePersistentState<T>(namespacedKey, defaultValue);
};

export { usePersistentState, useScopedPersistentState };
