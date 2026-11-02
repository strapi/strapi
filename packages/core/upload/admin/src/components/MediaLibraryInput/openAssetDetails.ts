import { useId, useLayoutEffect, useSyncExternalStore } from 'react';

/**
 * The media fields that have their asset details drawer open. An entry's media
 * fields share no parent this package owns, yet a press on any of them is a
 * press outside another field's open drawer — which closes it, or asks about its
 * unsaved edits. Nothing should open over that, from any field.
 */
const openFields = new Set<string>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** Read at event time, so a handler never acts on a stale render. */
export const isAnyAssetDetailsOpen = () => openFields.size > 0;

/**
 * Registers this field's drawer while `isOpen`, and returns whether any field —
 * this one included — has one open.
 *
 * A layout effect, not a plain one: the drawer that a press closes must be gone
 * from the set before that press's click reaches the next field.
 */
export const useOpenAssetDetails = (isOpen: boolean) => {
  const id = useId();

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    openFields.add(id);
    listeners.forEach((listener) => listener());

    return () => {
      openFields.delete(id);
      listeners.forEach((listener) => listener());
    };
  }, [id, isOpen]);

  return useSyncExternalStore(subscribe, isAnyAssetDetailsOpen);
};
