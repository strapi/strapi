import { MAIN_SLUG } from '../constants';

/**
 * The active branch is client-side state: a slug in localStorage, attached to
 * every backend request as the `X-Strapi-Branch` header by the fetch
 * interceptor. Nothing stored (or `main`) = the trunk. A stale slug (merged,
 * deleted, other workspace) is healed by the picker, which falls back to main.
 */
const STORAGE_KEY = 'strapi-branches:current-slug';

const listeners = new Set<() => void>();

const getCurrentBranchSlug = (): string => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? MAIN_SLUG;
  } catch {
    return MAIN_SLUG;
  }
};

const setCurrentBranchSlug = (slug: string): void => {
  try {
    if (slug === MAIN_SLUG) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, slug);
    }
  } catch {
    // Storage unavailable — the choice simply won't persist across reloads.
  }
  listeners.forEach((listener) => listener());
};

const isOnMain = (): boolean => getCurrentBranchSlug() === MAIN_SLUG;

/** Subscribe to switches (the pickers rendered in several places stay in sync). */
const subscribeToBranch = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export { getCurrentBranchSlug, setCurrentBranchSlug, isOnMain, subscribeToBranch };
