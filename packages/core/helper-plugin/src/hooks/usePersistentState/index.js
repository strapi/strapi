import { useState, useEffect } from 'react';

const usePersistentState = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
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

  return [value, setValue];
};

export default usePersistentState;
