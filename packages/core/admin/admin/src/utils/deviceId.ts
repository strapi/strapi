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

  // Use Web Crypto API which is available in modern browsers
  const generated = crypto.randomUUID();

  window.localStorage.setItem(storageKey, generated);

  return generated;
};

// TODO: do we need this as a fallback ?
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
