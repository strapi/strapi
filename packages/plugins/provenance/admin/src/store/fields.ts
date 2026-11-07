import * as React from 'react';

import type { PendingPaste } from '../components/FieldsModal';
import type { EntryProvenance } from '../constants';

/**
 * What the per-field label actions need from the Provenance panel of the open edit view.
 * The labels are rendered by the Content Manager, outside the panel's React tree, so the
 * panel publishes its state here.
 */
export type FieldsState = {
  provenance: EntryProvenance;
  pending: PendingPaste[];
  canEdit: boolean;
  /** Fields the user may update, from the Content Manager permissions */
  canUpdateFields: string[];
  isSubmitting: boolean;
  markAsAi: (field: string) => void;
  cancel: (field: string) => void;
};

let state: FieldsState | null = null;
const listeners = new Set<() => void>();

export const fieldsStore = {
  get: () => state,
  set(next: FieldsState | null) {
    state = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

export const useFieldsStore = () =>
  React.useSyncExternalStore(fieldsStore.subscribe, fieldsStore.get);
