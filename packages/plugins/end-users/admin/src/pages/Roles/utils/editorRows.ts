import * as React from 'react';

import { DATA_ACTIONS } from '../../../../../shared/contracts/permissions';

import type {
  DataAction,
  PermissionLayout,
  PermissionRow,
} from '../../../../../shared/contracts/permissions';
import type { PermissionsRow } from '@strapi/admin/strapi-admin';

/**
 * The rows the editor last reported, which a save is built from. They are not React state: a click
 * in the editor must not render the page, so what shows them (the Settings button of a content
 * type, the details pane) watches this store and renders only when its own part has changed.
 */
interface EditorRows {
  get: () => PermissionsRow[];
  set: (rows: PermissionsRow[]) => void;
  subscribe: (listener: () => void) => () => void;
  /** The data actions granted on a content type as one string, so watchers compare it cheaply */
  grantedKey: (uid: string) => string;
}

const createEditorRows = (initial: PermissionsRow[]): EditorRows => {
  let rows = initial;
  let granted: Map<string, string> | null = null;
  const listeners = new Set<() => void>();

  // Built once per change, on the first question: the editor only reports a row for an action it
  // grants, so a row of a content type is one of its granted actions
  const grantedByType = () => {
    if (granted === null) {
      const byType = new Map<string, Set<string>>();

      rows.forEach(({ subject, action }) => {
        if (subject) {
          byType.set(subject, (byType.get(subject) ?? new Set<string>()).add(action));
        }
      });

      granted = new Map(
        [...byType].map(([uid, actions]) => [
          uid,
          DATA_ACTIONS.filter((action) => actions.has(action)).join(','),
        ])
      );
    }

    return granted;
  };

  return {
    get: () => rows,
    set: (next) => {
      rows = next;
      granted = null;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    grantedKey: (uid) => grantedByType().get(uid) ?? '',
  };
};

const NO_ACTIONS: DataAction[] = [];

/** The data actions the editor grants on a content type now, in the editor's column order */
const useGrantedActions = (store: EditorRows, uid: string): DataAction[] => {
  const key = React.useSyncExternalStore(store.subscribe, () => store.grantedKey(uid));

  return React.useMemo(() => (key === '' ? NO_ACTIONS : (key.split(',') as DataAction[])), [key]);
};

/** The rows the editor last reported */
const useEditorRows = (store: EditorRows): PermissionsRow[] =>
  React.useSyncExternalStore(store.subscribe, store.get);

/**
 * The editor's rows as stored rows (the action of a column is the layout's `actionId`), for what
 * shows the role as it is being edited. Only what the editor grants is in them: a row it has set
 * aside is not shown there either, and the editor reports only the properties it ticks.
 */
const toGrantedRows = (rows: PermissionsRow[], layout: PermissionLayout): PermissionRow[] => {
  const actionIds = new Map<string, string>(
    layout.contentTypes.flatMap(({ uid, actions }) =>
      actions.map(({ action, actionId }): [string, string] => [`${uid}:${action}`, actionId])
    )
  );

  return rows.flatMap((row) => {
    const action = row.subject ? actionIds.get(`${row.subject}:${row.action}`) : row.action;

    return action ? [{ action, subject: null, properties: {}, conditions: [] }] : [];
  });
};

export { createEditorRows, toGrantedRows, useEditorRows, useGrantedActions };
export type { EditorRows };
