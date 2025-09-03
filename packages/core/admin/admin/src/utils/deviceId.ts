import crypto from 'crypto';

/**
 * Returns a stable device identifier for session-based authentication flows.
 * Uses localStorage to persist a UUID between sessions on the same browser.
 */
export const getOrCreateDeviceId = (): string => {
  const storageKey = 'strapi.admin.deviceId';

  try {
    const existing = window.localStorage.getItem(storageKey);

    if (existing && typeof existing === 'string') {
      return existing;
    }
  } catch {
    // Ignore storage errors and fallback to ephemeral id
  }

  const generated = crypto.randomUUID();
  // TODO not needed?
  // : generateRandomHex32();

  window.localStorage.setItem(storageKey, generated);

  return generated;
};

const _generateRandomHex32 = (): string => {
  const bytes = new Uint8Array(16);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
