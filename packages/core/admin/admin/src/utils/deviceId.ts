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
  try {
    window.localStorage.setItem(storageKey, generated);
  } catch {
    // no-op
  }

  return generated;
};
