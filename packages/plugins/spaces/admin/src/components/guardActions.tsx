import * as React from 'react';

import { DEFAULT_SPACE_SLUG, useCurrentSpaceSlug } from '../utils/currentSpace';
import { useEntryStates } from '../utils/entryStates';

import type {
  BulkActionComponent,
  DocumentActionComponent,
} from '@strapi/content-manager/strapi-admin';

/**
 * Actions that never mutate the entry they are shown on, by `type`.
 *
 * A safe-list, not a deny-list: plugin actions that DO write often declare no
 * type at all (i18n's "Delete entry (locale)" is the one the read-only rule was
 * written for), so anything unrecognised has to be treated as a write.
 */
const SAFE_DOCUMENT_TYPES = new Set([
  'clone',
  'configure-the-view',
  'edit',
  'edit-the-model',
  'history',
  'open-in-new-tab',
]);

/**
 * The ids of the given documents this workspace may not write to.
 *
 * Every guarded action calls this, so a list view asks about the same rows many
 * times over; `useEntryStates` collapses all of it into one request per page.
 * The default workspace edits everything, so it asks nothing at all.
 */
const useLockedDocumentIds = (model: string, documentIds: string[]): Set<string> => {
  const slug = useCurrentSpaceSlug();
  const isDefault = slug === DEFAULT_SPACE_SLUG;
  const states = useEntryStates(isDefault ? '' : model, isDefault ? [] : documentIds);

  return React.useMemo(
    () => new Set(documentIds.filter((id) => states[id]?.editable === false)),
    [states, documentIds]
  );
};

const cache = new WeakMap<object, object>();

const memoize = <T extends object>(Action: T, build: () => T): T => {
  const hit = cache.get(Action) as T | undefined;
  if (hit) {
    return hit;
  }
  const built = build();
  cache.set(Action, built);
  return built;
};

/**
 * On an entry the active workspace may not edit (a shared entry, or an entry
 * of a shared content type), every Content Manager document action is
 * disabled except the non-mutating ones (duplicate, configure, history). The
 * wrapped action still runs, so its hooks keep their order; only its
 * description is altered. The server refuses those writes anyway — this keeps
 * the UI from advertising them.
 */
export const guardDocumentAction = (Action: DocumentActionComponent): DocumentActionComponent => {
  if (Action.type && SAFE_DOCUMENT_TYPES.has(Action.type)) {
    return Action;
  }

  return memoize(Action, () => {
    const Guarded: DocumentActionComponent = (props) => {
      const locked = useLockedDocumentIds(
        props.model,
        React.useMemo(() => (props.documentId ? [props.documentId] : []), [props.documentId])
      );
      const description = Action(props);
      if (!description || !props.documentId || !locked.has(props.documentId)) {
        return description;
      }
      return { ...description, disabled: true };
    };
    Guarded.type = Action.type;
    Guarded.position = Action.position;
    Guarded.displayName = `WorkspaceGuarded(${Action.displayName ?? Action.name ?? Action.type})`;
    return Guarded;
  });
};

/** Bulk actions are disabled as soon as one selected entry is read-only here. */
export const guardBulkAction = (Action: BulkActionComponent): BulkActionComponent =>
  memoize(Action, () => {
    const Guarded: BulkActionComponent = (props) => {
      const documentIds = React.useMemo(
        () =>
          (props.documents ?? [])
            .map((document) => (document as { documentId?: unknown }).documentId)
            .filter((id): id is string => typeof id === 'string'),
        [props.documents]
      );
      const locked = useLockedDocumentIds(props.model, documentIds);
      const description = Action(props);
      if (!description || locked.size === 0) {
        return description;
      }
      return { ...description, disabled: true };
    };
    Guarded.type = Action.type;
    Guarded.displayName = `WorkspaceGuarded(${Action.displayName ?? Action.name ?? Action.type})`;
    return Guarded;
  });

interface ActionGetters {
  getDocumentActions: (position?: unknown) => DocumentActionComponent[];
  getBulkActions: () => BulkActionComponent[];
}

/**
 * Wraps the Content Manager's action getters rather than reducing the lists at
 * bootstrap: the getters run at render time, so actions other plugins register
 * after this one (i18n's "Delete locale", releases, branches) are guarded too.
 */
export const guardContentManagerActions = (apis: ActionGetters) => {
  const getDocumentActions = apis.getDocumentActions;
  const getBulkActions = apis.getBulkActions;
  apis.getDocumentActions = (position?: unknown) =>
    getDocumentActions(position).map(guardDocumentAction);
  apis.getBulkActions = () => getBulkActions().map(guardBulkAction);
};
