import { DEFAULT_CHANNEL_SLUG } from '../constants';

/**
 * The active channel is client-side state: a slug in localStorage, attached to
 * every backend request as the `X-Strapi-Channel` header by the fetch
 * interceptor. Nothing stored (or `default`) = the base content.
 *
 * Channels are per workspace when the Spaces plugin is installed, so the
 * storage key is scoped by the active workspace (soft-read from spaces' own
 * localStorage slug — no import, no hard dependency): switching workspaces
 * switches to THAT workspace's remembered channel instead of leaking a slug
 * the new workspace does not know (which would 400 every request).
 *
 * The stored slug is also stamped with the admin user who chose it — two
 * admins sharing a browser must not inherit each other's channel (lesson from
 * the spaces plugin's sign-in fixes). Stale or foreign slugs are healed by
 * `useChannels` and by the interceptor's 400 self-heal.
 */
const BASE_STORAGE_KEY = 'strapi-channels:current-slug';
const SPACES_STORAGE_KEY = 'strapi-spaces:current-slug';

const workspaceSuffix = (): string => {
  try {
    const workspace = window.localStorage.getItem(SPACES_STORAGE_KEY);
    return workspace ? `:${workspace}` : '';
  } catch {
    return '';
  }
};

const storageKey = () => `${BASE_STORAGE_KEY}${workspaceSuffix()}`;
const ownerKey = () => `${BASE_STORAGE_KEY}-owner${workspaceSuffix()}`;

const listeners = new Set<() => void>();

const getCurrentChannelSlug = (): string => {
  try {
    return window.localStorage.getItem(storageKey()) ?? DEFAULT_CHANNEL_SLUG;
  } catch {
    return DEFAULT_CHANNEL_SLUG;
  }
};

const getCurrentChannelOwner = (): string | null => {
  try {
    return window.localStorage.getItem(ownerKey());
  } catch {
    return null;
  }
};

const setCurrentChannelSlug = (slug: string, owner?: string | null): void => {
  try {
    if (slug === DEFAULT_CHANNEL_SLUG) {
      window.localStorage.removeItem(storageKey());
      window.localStorage.removeItem(ownerKey());
    } else {
      window.localStorage.setItem(storageKey(), slug);
      if (owner) {
        window.localStorage.setItem(ownerKey(), owner);
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
