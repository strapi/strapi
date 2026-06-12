import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useInitQuery } from '../services/admin';

function readFromStorage<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    // if primitive was stored
    return raw as unknown as T;
  }
}

const usePersistentState = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => readFromStorage(key, defaultValue));

  const currentKeyRef = useRef(key);

  // when the key changes, re-hydrate from the new key
  useEffect(() => {
    if (currentKeyRef.current !== key) {
      currentKeyRef.current = key;
      setValue(readFromStorage(key, defaultValue));
    }
    // include defaultValue in case it changes across models
  }, [key, defaultValue]);

  // Persist synchronously after commit so values survive same-tab navigation (e.g. external
  // links) before the next paint — useEffect can run after unload and skip writing.
  useLayoutEffect(() => {
    if (currentKeyRef.current !== key) return; // safety guard

    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};

const usePersistentStateScope = () => {
  const { data: initData } = useInitQuery();

  return initData?.uuid;
};

// Same as usePersistentState, but scoped to the current instance of Strapi
// useful for storing state that should not be shared across different instances of Strapi running on localhost
const useScopedPersistentState = <T>(key: string, defaultValue: T) => {
  const uuid = usePersistentStateScope();

  const namespacedKey = `${key}:${uuid}`;
  return usePersistentState<T>(namespacedKey, defaultValue);
};

export { usePersistentState, useScopedPersistentState, usePersistentStateScope };
