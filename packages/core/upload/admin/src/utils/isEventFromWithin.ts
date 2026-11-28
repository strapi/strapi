import type { SyntheticEvent } from 'react';

/**
 * True when the event really originated inside `currentTarget`'s DOM subtree.
 *
 * Portaled content (Radix menus, modals, select popovers) bubbles through the
 * React tree, so a row's handlers see events coming from dialogs rendered by
 * its own children. Guarding on DOM containment keeps those out — without
 * calling `stopPropagation`, which would also kill the native event before it
 * reaches `document`, where Radix listens in order to dismiss its layers.
 */
export const isEventFromWithin = (event: SyntheticEvent) =>
  event.currentTarget instanceof Node &&
  event.target instanceof Node &&
  event.currentTarget.contains(event.target);
