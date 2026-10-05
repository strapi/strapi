import { expect, it } from 'vitest';

it.each(['localStorage', 'sessionStorage'] as const)(
  'provides browser %s to admin code',
  (name) => {
    const storage = globalThis[name];
    const key = 'users-permissions-browser-storage';

    expect(storage).toBeInstanceOf(Storage);
    expect(storage.getItem(key)).toBeNull();

    try {
      storage.setItem(key, 'stored value');
      expect(window[name].getItem(key)).toBe('stored value');
    } finally {
      storage.removeItem(key);
    }

    expect(storage.getItem(key)).toBeNull();
  }
);
