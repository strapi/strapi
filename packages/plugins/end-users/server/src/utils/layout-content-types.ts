import type { Core } from '@strapi/types';

import { DATA_ACTIONS } from '../../../shared/contracts/permissions';
import type { DataAction } from '../../../shared/contracts/permissions';
import { PLUGIN_ID, PROFILE_UID, ROLE_UID, USER_UID } from '../constants';

/**
 * The data action an action id names on a content type (`find` for `api::note.note.find` on
 * `api::note.note`), or null when it names anything else: a route's own action (`stats`), or another
 * content type's.
 */
export const dataActionOf = (action: string, uid: string): DataAction | null => {
  const name = action.startsWith(`${uid}.`) ? action.slice(uid.length + 1) : '';

  return (DATA_ACTIONS as readonly string[]).includes(name) ? (name as DataAction) : null;
};

/**
 * The plugin's own types that are not offered in the layout: the engine's tables
 * (sessions, accounts with their hashes, verifications, two-factor secrets, a Better Auth plugin's
 * keys) and the permissions engine's permission rows. Only the user, its profile and the role (for
 * reading it through the user's `roles`, with `find` alone) are ever granted through a role.
 */
export const isEngineType = (uid: string): boolean =>
  uid.startsWith(`plugin::${PLUGIN_ID}.`) &&
  uid !== USER_UID &&
  uid !== PROFILE_UID &&
  uid !== ROLE_UID;

/**
 * The content types the permission layout lists, in the order Strapi holds them: those with at
 * least one registered data action (`find`, `findOne`, `create`, `update`, `delete`, `read-drafts`,
 * `publish`), a route's or a synthetic one, which is what a role could be granted on them. Reads the
 * action registries, so it is only meaningful once Strapi has registered the Content API routes.
 */
export const layoutContentTypeUids = (strapi: Core.Strapi): string[] => {
  const { providers, subjectOf } = strapi.contentAPI.permissions;
  const withActions = new Set<string>();

  for (const action of [...providers.action.keys(), ...providers.syntheticAction.keys()]) {
    const uid = subjectOf(action);

    if (uid !== null && dataActionOf(action, uid) !== null) {
      withActions.add(uid);
    }
  }

  return Object.keys(strapi.contentTypes).filter(
    (uid) => withActions.has(uid) && !isEngineType(uid)
  );
};

/**
 * The content types a stored condition may name while Strapi starts: those the project holds that
 * are not the engine's own tables, an admin type or a Strapi-internal one. The action registries
 * are only filled at bootstrap, after the project's condition files are read in `register()` (and
 * core's condition registry refuses registrations once Strapi has loaded), so this reads the
 * content types alone. A save and the preview keep the stricter `layoutContentTypeUids`.
 */
export const registerTimeContentTypeUids = (strapi: Core.Strapi): string[] =>
  Object.keys(strapi.contentTypes).filter(
    (uid) => !isEngineType(uid) && !uid.startsWith('admin::') && !uid.startsWith('strapi::')
  );
