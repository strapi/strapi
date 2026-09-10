/* eslint-disable check-file/filename-naming-convention */
import { matchPath } from 'react-router-dom';

import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { fetchEntryState } from '../utils/entryStates';

import type { RBACMiddleware } from '@strapi/admin/strapi-admin';

const LOCKED_ACTIONS = new Set([
  'plugin::content-manager.explorer.update',
  'plugin::content-manager.explorer.delete',
  'plugin::content-manager.explorer.publish',
]);

/**
 * Locks the Content Manager edit view of an entry the active workspace may
 * not edit (a shared entry, or an entry of a shared content type) by dropping
 * the update/delete/publish permissions for that model. The CM then disables
 * the inputs and hides the write actions through its own RBAC mechanics; the
 * server refuses the writes anyway — this is the affordance, not the guarantee.
 *
 * Default sees and edits everything, so it is a passthrough there.
 */
export const workspaceEntryLockMiddleware: RBACMiddleware =
  (ctx) => (next) => async (permissions) => {
    if (getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG) {
      return next(permissions);
    }

    const match = matchPath('/content-manager/collection-types/:model/:id', ctx.pathname);
    const model = match?.params.model;
    const documentId = match?.params.id;

    if (!model || !documentId || documentId === 'create') {
      return next(permissions);
    }

    const state = await fetchEntryState(model, documentId);
    if (!state || state.editable) {
      return next(permissions);
    }

    return next(
      permissions.filter(
        (permission) => !(permission.subject === model && LOCKED_ACTIONS.has(permission.action))
      )
    );
  };
