import * as React from 'react';

/**
 * Fields unlocked for override but not saved yet, shared between the field
 * gate (which unlocks) and the label badge (which shows the Overridden chip
 * optimistically and can restore the inherited value). Keyed per document,
 * channel, locale and field; holds the inherited value captured at unlock
 * time so a reset before saving puts it back.
 */
const drafts = new Map<string, unknown>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const draftKey = (parts: {
  model: string;
  documentId: string;
  channel: string;
  locale: string | null;
  field: string;
}) => `${parts.model}|${parts.documentId}|${parts.channel}|${parts.locale ?? ''}|${parts.field}`;

export const markUnlocked = (key: string, inheritedValue: unknown) => {
  drafts.set(key, inheritedValue);
  notify();
};

export const clearUnlocked = (key: string) => {
  if (drafts.delete(key)) {
    notify();
  }
};

export const isUnlocked = (key: string) => drafts.has(key);

export const getInheritedValue = (key: string) => drafts.get(key);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useIsUnlocked = (key: string) =>
  React.useSyncExternalStore(subscribe, () => drafts.has(key));
