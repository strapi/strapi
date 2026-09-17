import { DEFAULT_CHANNEL_SLUG } from '../constants';

/**
 * The active channel is client-side state: a slug in localStorage, attached to
 * every backend request as the `X-Strapi-Channel` header by the fetch
 * interceptor. Nothing stored (or `default`) = the base content. The stored
 * slug is stamped with the admin user who chose it — two admins sharing a
 * browser must not inherit each other's channel (lesson from the spaces
 * plugin's sign-in fixes) — and a stale or foreign slug is healed by
 * `useChannels`, which falls back to the base.
 */
const STORAGE_KEY = 'strapi-channels:current-slug';
const OWNER_KEY = 'strapi-channels:current-slug-owner';

const listeners = new Set<() => void>();

const getCurrentChannelSlug = (): string => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CHANNEL_SLUG;
  } catch {
    return DEFAULT_CHANNEL_SLUG;
  }
};

const getCurrentChannelOwner = (): string | null => {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};

const setCurrentChannelSlug = (slug: string, owner?: string | null): void => {
  try {
    if (slug === DEFAULT_CHANNEL_SLUG) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(OWNER_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, slug);
      if (owner) {
        window.localStorage.setItem(OWNER_KEY, owner);
      }
    }
  } catch {
    // Storage unavailable — the choice simply won't persist across reloads.
  }
  listeners.forEach((listener) => listener());
};

const isOnDefaultChannel = (): boolean => getCurrentChannelSlug() === DEFAULT_CHANNEL_SLUG;

/** Subscribe to switches (the pickers rendered in several places stay in sync). */
const subscribeToChannel = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export {
  getCurrentChannelSlug,
  getCurrentChannelOwner,
  setCurrentChannelSlug,
  isOnDefaultChannel,
  subscribeToChannel,
};
