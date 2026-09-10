import { useSyncExternalStore } from 'react';

/**
 * The active workspace is client-side state: a slug in localStorage, attached
 * to every backend request as the `X-Strapi-Space-Id` header by the fetch
 * interceptor installed in `admin/src/index.ts`.
 *
 * An admin is ALWAYS in a workspace — there is no "all workspaces" mode in the
 * admin. With nothing stored we fall back to the seeded `default` workspace;
 * if the stored slug stops existing (renamed install, archived space), the
 * SpaceSwitcher self-heals by selecting the first active workspace.
 */
const STORAGE_KEY = 'strapi-spaces:current-slug';

/**
 * The admin the stored slug belongs to.
 *
 * The slug is browser state but the workspace is a property of the *user*: two
 * admins sharing a browser (or one machine, two accounts) must not inherit each
 * other's workspace, and the server remembers each user's last one. Without
 * this the switcher would consider the stored slug valid for whoever logs in
 * next and never ask the server where *they* left off.
 */
const OWNER_KEY = 'strapi-spaces:current-slug-owner';

const DEFAULT_SPACE_SLUG = 'default';

const listeners = new Set<() => void>();

/** The stored slug as is — `null` when nothing was stored yet (first visit on this browser). */
const getStoredSpaceSlug = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const getCurrentSpaceSlug = (): string => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SPACE_SLUG;
  } catch {
    return DEFAULT_SPACE_SLUG;
  }
};

/** The id of the admin the stored slug belongs to, `null` when unknown. */
const getStoredSpaceOwner = (): string | null => {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};

const setCurrentSpaceSlug = (slug: string, ownerId?: string | number): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, slug);
    if (ownerId !== undefined) {
      window.localStorage.setItem(OWNER_KEY, String(ownerId));
    }
  } catch {
    // Storage unavailable (private browsing hard mode) — the switcher simply
    // won't persist across reloads.
  }
  listeners.forEach((listener) => listener());
};

const subscribeToCurrentSpace = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Reactive flavour of `getCurrentSpaceSlug` for components that must follow a switch. */
const useCurrentSpaceSlug = (): string =>
  useSyncExternalStore(subscribeToCurrentSpace, getCurrentSpaceSlug, () => DEFAULT_SPACE_SLUG);

export {
  getCurrentSpaceSlug,
  getStoredSpaceSlug,
  getStoredSpaceOwner,
  setCurrentSpaceSlug,
  subscribeToCurrentSpace,
  useCurrentSpaceSlug,
  DEFAULT_SPACE_SLUG,
};
