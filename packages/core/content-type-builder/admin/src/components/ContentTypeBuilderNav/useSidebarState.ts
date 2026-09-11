import { useSyncExternalStore } from 'react';

/**
 * Whether the list of schemas is showing beside the page.
 *
 * Collapsed to a strip by default: the index is the way in now, and the list is
 * for hopping between types once you are working inside one. The choice is
 * remembered per browser — someone who works type-to-type all day should say so
 * once, not once a page.
 */
const STORAGE_KEY = 'strapi-ctb:schema-list';

const listeners = new Set<() => void>();

const read = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'expanded';
  } catch {
    return false;
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setSchemaListExpanded = (expanded: boolean): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, expanded ? 'expanded' : 'collapsed');
  } catch {
    // Storage unavailable: the choice simply does not outlive the page.
  }
  listeners.forEach((listener) => listener());
};

export const useSchemaListExpanded = (): boolean =>
  useSyncExternalStore(subscribe, read, () => false);
