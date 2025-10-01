const fallbackUUIDv4 = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};

/**
 * Returns a stable device identifier for session-based authentication flows.
 * Uses localStorage to persist a UUID between sessions on the same browser.
 */
export const getOrCreateDeviceId = (): string => {
  const storageKey = 'strapi.admin.deviceId';

  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  // Use randomUUID in secure contexts, otherwise polyfill
  const generated =
    typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : fallbackUUIDv4();

  try {
    window.localStorage.setItem(storageKey, generated);
  } catch {
    // no-op
  }

  return generated;
};
