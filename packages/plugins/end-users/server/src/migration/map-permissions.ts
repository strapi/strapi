import { isSelf } from '../conditions';
import { PLUGIN_ID, PROFILE_UID, ROLE_FIND_ACTION, ROLE_UID, USER_UID } from '../constants';
import { DEFAULT_AUTHENTICATED_PERMISSIONS, ownProfileRow } from '../utils/default-permissions';
import type { PermissionRow } from '../utils/permission-row';

const UP = 'plugin::users-permissions';
const EU = `plugin::${PLUGIN_ID}`;

export interface PermissionMapContext {
  /** Whether Users & Permissions compatibility stays on, so `user.count` keeps an answer */
  compat: boolean;
  /** The types with core Content API actions (`api::*`), by uid */
  contentTypes: Record<string, { draftAndPublish: boolean }>;
  /** The attributes a row may name for a type, to read or to write */
  fields: (uid: string, use: 'read' | 'write') => string[];
  /** Whether the action is registered; `null` when that can't be told */
  isKnownAction: (action: string) => boolean | null;
}

export type DroppedReason = 'auth-route' | 'roles-api' | 'compat-off' | 'unknown';

export interface RolePermissionMapping {
  rows: PermissionRow[];
  dropped: Array<{ action: string; reason: DroppedReason }>;
  changed: Array<{ action: string; change: 'drafts' | 'is-self' }>;
}

const API_ACTION = /^(api::[^.]+\.[^.]+)\.(find|findOne|create|update|delete)$/;

const row = (
  action: string,
  subject: string | null,
  fields?: string[] | null,
  conditions: PermissionRow['conditions'] = []
): PermissionRow => ({
  action,
  subject,
  properties: fields === undefined ? {} : { fields },
  conditions,
});

const routeRow = (name: string) => row(`${EU}.${name}`, null);

const selfCondition = (): PermissionRow['conditions'] => [{ name: isSelf.name }];

/**
 * What a Users & Permissions role's actions become in end-users rows, with the fixes the migration
 * applies: `is-self` on `user.update` and `user.delete`, explicit field lists on Create and Update, and no
 * draft access. Pure: what the running application knows comes in through `ctx`.
 *
 * Whatever has no counterpart is listed in `dropped` with the reason, and a row that came out
 * narrower than the action it came from is listed in `changed`. Rows of the same action and subject
 * collapse to the first. An action `isKnownAction` can't tell about (`null`) is dropped as unknown:
 * the safe side.
 */
export const mapRolePermissions = (
  actions: readonly string[],
  roleType: string,
  ctx: PermissionMapContext
): RolePermissionMapping => {
  const collapsed = new Map<string, PermissionRow>();
  const dropped: RolePermissionMapping['dropped'] = [];
  const changed: RolePermissionMapping['changed'] = [];

  const add = (...rows: PermissionRow[]) => {
    for (const next of rows) {
      const key = `${next.action}\u0000${next.subject ?? ''}`;

      if (!collapsed.has(key)) {
        collapsed.set(key, next);
      }
    }
  };

  const profileFields = (use: 'read' | 'write') =>
    ctx.fields(PROFILE_UID, use).filter((name) => name !== 'user');

  const ownProfile = (action: string, fields?: string[]): PermissionRow => {
    const built = ownProfileRow(action);

    return fields === undefined ? built : { ...built, properties: { fields } };
  };

  if (roleType === 'authenticated') {
    // The own-profile update row is left out on purpose: the role gets it only when it held
    // Users & Permissions' user.update (see the `update` branch below).
    add(...DEFAULT_AUTHENTICATED_PERMISSIONS.filter((d) => d.action !== `${PROFILE_UID}.update`));
  }

  const drop = (action: string, reason: DroppedReason) => dropped.push({ action, reason });

  for (const action of actions) {
    const userAction = action.startsWith(`${UP}.user.`) ? action.slice(`${UP}.user.`.length) : null;
    const apiMatch = API_ACTION.exec(action);

    if (userAction === 'find' || userAction === 'findOne') {
      add(row(`${EU}.user.${userAction}`, USER_UID, ctx.fields(USER_UID, 'read')));
    } else if (userAction === 'count') {
      if (ctx.compat) {
        add(row(`${EU}.user.count`, USER_UID, ctx.fields(USER_UID, 'read')));
      } else {
        drop(action, 'compat-off');
      }
    } else if (userAction === 'create') {
      add(row(`${EU}.user.create`, USER_UID, ctx.fields(USER_UID, 'write')));
    } else if (userAction === 'update') {
      add(
        row(`${EU}.user.update`, USER_UID, ctx.fields(USER_UID, 'write'), selfCondition()),
        routeRow('me.updateProfile'),
        ownProfile('update', profileFields('write'))
      );
      changed.push({ action, change: 'is-self' });
    } else if (userAction === 'destroy') {
      add(row(`${EU}.user.delete`, USER_UID, undefined, selfCondition()));
      changed.push({ action, change: 'is-self' });
    } else if (userAction === 'me') {
      add(
        routeRow('me.find'),
        routeRow('me.findProfile'),
        ownProfile('find'),
        ownProfile('findOne')
      );
    } else if (action === `${UP}.role.find`) {
      add(row(ROLE_FIND_ACTION, ROLE_UID, null));
    } else if (action.startsWith(`${UP}.role.`) || action.startsWith(`${UP}.permissions.`)) {
      drop(action, 'roles-api');
    } else if (action.startsWith(`${UP}.auth.`) || action === `${UP}.connect`) {
      drop(action, 'auth-route');
    } else if (apiMatch && ctx.contentTypes[apiMatch[1]]) {
      const [, subject, verb] = apiMatch;
      let fields: string[] | null | undefined;

      if (verb === 'create' || verb === 'update') {
        fields = ctx.fields(subject, 'write');
      } else if (verb !== 'delete') {
        fields = null;
      }

      add(row(action, subject, fields));

      if (ctx.contentTypes[subject].draftAndPublish) {
        changed.push({ action, change: 'drafts' });
      }
    } else if (!action.startsWith(`${UP}.`) && ctx.isKnownAction(action) === true) {
      add(row(action, null));
    } else {
      drop(action, 'unknown');
    }
  }

  return { rows: [...collapsed.values()], dropped, changed };
};
