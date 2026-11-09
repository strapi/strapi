import type { Core } from '@strapi/types';

import { ADMIN_ACTIONS } from './admin-actions';
import { logBootWarnings } from './boot-warnings';
import { readCompatConfig } from './compat/config';
import { defineLegacyOrigin } from './compat/origin';
import { isOwner } from './conditions';
import { PLUGIN_ID, PROFILE_UID, ROLE_FIND_ACTION, USER_UID } from './constants';
import { registry } from './providers/registry';
import type permissionService from './services/permission';
import { NOT_GRANTABLE } from './services/permission-layout';
import type roleService from './services/role';
import type { PermissionRow } from './utils/permission-row';
import { asProfileLifecycle } from './utils/profile-lifecycle';

/** A route-only permission: the route's scope, no subject, no field rule, no condition */
const routeRow = (action: string): PermissionRow => ({
  action,
  subject: null,
  properties: {},
  conditions: [],
});

/** A permission on the caller's own profile: every field, through `is-owner` on `user` */
const ownProfileRow = (action: string): PermissionRow => ({
  action: `${PROFILE_UID}.${action}`,
  subject: PROFILE_UID,
  properties: {},
  conditions: [{ name: isOwner.name, params: { field: 'user' } }],
});

/**
 * What the Authenticated role may do when it is created:
 *
 * - the three `me` routes (`controllers/me.ts`), which answer only for the caller, so granting them
 *   leaks nothing;
 * - `find`, `findOne` and `update` on the profile type, with `is-owner` on its `user`: a user reads
 *   and changes their own profile, every field but `user`, which `is-owner` locks. No `create` or
 *   `delete`: the plugin makes and removes profiles with their user.
 *
 * Nothing else: not `/api/users*`, not `user.update`.
 *
 * The profile `update` row is the one written with no field list here; it is seeded with the
 * profile's attributes at first start (`writableProfileFields`) and an existing
 * database keeps the row it has.
 */
export const DEFAULT_AUTHENTICATED_PERMISSIONS: readonly PermissionRow[] = [
  routeRow('plugin::end-users.me.find'),
  routeRow('plugin::end-users.me.findProfile'),
  routeRow('plugin::end-users.me.updateProfile'),
  ownProfileRow('find'),
  ownProfileRow('findOne'),
  ownProfileRow('update'),
];

const PROFILE_UPDATE_ACTION = `${PROFILE_UID}.update`;

/**
 * The profile's attributes a request can write, taken now: the list Authenticated's
 * profile `update` row is seeded with, instead of every field. A field added to the profile later is
 * therefore not writable by end users until an administrator grants it. `user` is left out (it is
 * what `is-owner` locks), and so are private and read-only attributes. A component or relation is
 * named once, as the Content API's field rules take it.
 */
const writableProfileFields = (strapi: Core.Strapi): string[] => {
  const attributes = (
    strapi.contentTypes as unknown as Record<
      string,
      { attributes?: Record<string, { private?: boolean; writable?: boolean }> }
    >
  )[PROFILE_UID]?.attributes;

  return Object.entries(attributes ?? {})
    .filter(
      ([name, attribute]) =>
        name !== 'user' &&
        !NOT_GRANTABLE.has(name) &&
        attribute.private !== true &&
        attribute.writable !== false
    )
    .map(([name]) => name);
};

/**
 * Gives the Authenticated role its default permissions, all in one diff. Called only by the start
 * that inserted the role (`ensureDefaults` says which call did): an administrator who takes a
 * permission away must not have it come back on the next start, and a role made before a default
 * was added (a database from an earlier version, without the profile rows) is not given it either.
 *
 * That is also what keeps two instances starting together on an empty database from granting
 * twice. Both can find no role and both try to insert it; the unique index on the role's name
 * lets exactly one insert succeed, and only that one is told it created the role. The
 * other finds the role there, is told it did not create it, and grants nothing. So the permissions
 * are written once, by one instance, and need no check against what the role already holds.
 */
const grantDefaultPermissions = async (strapi: Core.Strapi) => {
  const plugin = strapi.plugin(PLUGIN_ID);
  const roles = plugin.service('role') as ReturnType<typeof roleService>;
  const permissions = plugin.service('permission') as ReturnType<typeof permissionService>;

  const { documentId } = await roles.getDefault();
  const profileFields = writableProfileFields(strapi);

  await permissions.applyDiff(documentId, {
    create: DEFAULT_AUTHENTICATED_PERMISSIONS.map((row) =>
      row.action === PROFILE_UPDATE_ACTION ? { ...row, properties: { fields: profileFields } } : row
    ),
    update: [],
    delete: [],
  });
};

const PAGE_SIZE = 500;

type UserKey = { id: number; documentId: string };

/** The field and message of a Strapi validation error, or its plain message */
const reasonOf = (error: unknown): string => {
  const { message, details } = (error ?? {}) as {
    message?: string;
    details?: { errors?: Array<{ path?: unknown[]; message?: string }> };
  };
  const named = (details?.errors ?? [])
    .map((entry) => `${(entry.path ?? []).join('.') || 'profile'}: ${entry.message ?? ''}`.trim())
    .join('; ');

  return named || message || String(error);
};

/**
 * Every user has a profile, and one that has none is given one at start: a database
 * from before the profile was made with its user, or users made while `profile.createOnSignUp` was
 * still a setting and off. Users are read a page at a time, so a large table is never held whole.
 *
 * A profile that cannot be made (a required field with no default) is logged, naming the user and
 * the field, and the start goes on: a user without a profile is a worse state than one that is
 * reported, and a throw here would stop the application from starting at all.
 */
export const ensureEveryUserHasAProfile = async (
  strapi: Core.Strapi
): Promise<{ created: number; failed: Array<{ userId: string; reason: string }> }> => {
  const users = strapi.db.query(USER_UID);
  const profiles = strapi.db.query(PROFILE_UID);
  const result = { created: 0, failed: [] as Array<{ userId: string; reason: string }> };

  const hasProfile = async (documentId: string) =>
    Boolean(await profiles.findOne({ where: { user: { documentId } }, select: ['id'] }));

  let lastId = 0;

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const page = (await users.findMany({
      select: ['id', 'documentId'],
      where: { id: { $gt: lastId } },
      orderBy: { id: 'asc' },
      limit: PAGE_SIZE,
    })) as UserKey[];

    if (page.length === 0) {
      return result;
    }

    lastId = page[page.length - 1].id;

    // eslint-disable-next-line no-await-in-loop
    const withProfile = (await profiles.findMany({
      where: { user: { documentId: { $in: page.map((user) => user.documentId) } } },
      populate: { user: { select: ['documentId'] } },
    })) as Array<{ user?: { documentId?: string } | null }>;
    const covered = new Set(withProfile.map((profile) => profile.user?.documentId));

    for (const { documentId } of page.filter((user) => !covered.has(user.documentId))) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await asProfileLifecycle(() =>
          strapi.documents(PROFILE_UID).create({
            data: { user: { connect: [documentId] } },
          } as never)
        );
        result.created += 1;
      } catch (error) {
        // Another instance starting at the same moment made it first: nothing is missing
        // eslint-disable-next-line no-await-in-loop
        if (!(await hasProfile(documentId))) {
          const reason = reasonOf(error);

          result.failed.push({ userId: documentId, reason });
          strapi.log.warn(
            `end-users: could not make the profile of user ${documentId} (${reason}). ` +
              'The user has no profile until the field is filled or given a default.'
          );
        }
      }
    }
  }
};

/**
 * A required profile attribute with no default makes every user create that cannot fill it fail:
 * an OAuth sign-in, a user made in the Content Manager, a script. Only a sign-up that carries the
 * field (a registration field) can. It is named at start so the cause is not found in a failure.
 */
export const warnAboutRequiredProfileAttributes = (strapi: Core.Strapi): string[] => {
  const attributes = (
    strapi.contentTypes as unknown as Record<
      string,
      { attributes?: Record<string, { required?: boolean; default?: unknown; type?: string }> }
    >
  )[PROFILE_UID]?.attributes;

  const names = Object.entries(attributes ?? {})
    .filter(
      ([name, attribute]) =>
        name !== 'user' &&
        attribute.required === true &&
        attribute.default === undefined &&
        attribute.type !== 'uid'
    )
    .map(([name]) => name);

  for (const name of names) {
    strapi.log.warn(
      `end-users: the profile attribute \`${name}\` is required and has no default, so every user ` +
        'create that cannot fill it fails (OAuth sign-in, the Content Manager, scripts). Give it a ' +
        'default, or make it optional.'
    );
  }

  return names;
};

/** The columns of the user's list in the Content Manager, in this order */
export const USER_LIST_LAYOUT: readonly string[] = [
  'email',
  'username',
  'roles',
  'emailVerified',
  'twoFactorEnabled',
  'banned',
  'lastSignInAt',
];

const LIST_LAYOUT_KEY = 'userListLayoutWritten';

/**
 * Writes the Content Manager's list layout for the user type, once. Without it the list shows the
 * first four attributes (name, email, and whatever follows), which is not what an administrator
 * looking for an end user needs. Once written it is the administrator's: they may reorder it, and a
 * later start does not put it back (the plugin's own store holds that it was done).
 *
 * The Content Manager's start makes the type's configuration first (it is an internal plugin, so it
 * starts before this one); where there is none yet nothing is written and nothing is recorded, so the
 * next start does it. Columns the type does not have (`username` without the username plugin) are
 * left out.
 */
export const writeUserListLayout = async (strapi: Core.Strapi): Promise<boolean> => {
  const own = strapi.store({ type: 'plugin', name: PLUGIN_ID });

  if (await own.get({ key: LIST_LAYOUT_KEY })) {
    return false;
  }

  const manager = strapi.store({ type: 'plugin', name: 'content_manager' });
  const key = `configuration_content_types::${USER_UID}`;
  const configuration = (await manager.get({ key })) as {
    layouts?: Record<string, unknown>;
  } | null;

  if (!configuration) {
    return false;
  }

  const attributes = (strapi.contentTypes as unknown as Record<string, { attributes?: object }>)[
    USER_UID
  ]?.attributes;
  const list = USER_LIST_LAYOUT.filter((name) => name in (attributes ?? {}));

  await manager.set({
    key,
    value: { ...configuration, layouts: { ...configuration.layouts, list } },
  });
  await own.set({ key: LIST_LAYOUT_KEY, value: true });

  return true;
};

/**
 * Makes `find` on the role type an action a role can be granted, with no route behind it. A relation
 * to a type is only read by a caller who may `find` that type (core's relation sanitizer asks for
 * `<target>.find`), and an action no route has is not one the Content API knows, so a `user.roles`
 * the editor offered could never be read. With the action registered, a row for it opens that scope
 * for the callers it is granted to, and carries the field rules of the role type.
 */
export const registerRoleReadAction = async (strapi: Core.Strapi): Promise<void> => {
  const { action } = strapi.contentAPI.permissions.providers;

  if (!action.has(ROLE_FIND_ACTION)) {
    await action.register(ROLE_FIND_ACTION, {
      api: `plugin::${PLUGIN_ID}`,
      controller: 'role',
      action: 'find',
      uid: ROLE_FIND_ACTION,
    });
  }
};

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  logBootWarnings(strapi);

  // Tokens Users & Permissions issued carry its origin: defined, they are read by core's session
  // manager as before
  const compat = readCompatConfig(strapi);

  if (compat.usersPermissions) {
    defineLegacyOrigin(strapi, compat);
  }

  // Loads and validates `providers` of config/plugins.ts: a bad entry or package
  // stops the application here, naming it, and not on the first authentication request
  registry(strapi);

  await registerRoleReadAction(strapi);

  // What an admin user can be granted to do with end users: the admin role editor lists them, and
  // the admin routes check them. Before the admin's own bootstrap, which gives the Super Admin
  // role every registered action.
  await strapi.service('admin::permission').actionProvider.registerMany(ADMIN_ACTIONS);

  // Public and Authenticated: what a request with no credentials, and a new user, are given
  const roles = strapi.plugin(PLUGIN_ID).service('role') as ReturnType<typeof roleService>;

  const { created } = await roles.ensureDefaults();

  // Only the start that inserted the role grants: one that found it already there, whether from an
  // earlier start or from an instance that won the race a moment ago, grants nothing
  if (created.authenticated) {
    await grantDefaultPermissions(strapi);
  }

  await writeUserListLayout(strapi);
  warnAboutRequiredProfileAttributes(strapi);
  await ensureEveryUserHasAProfile(strapi);
};

export default bootstrap;
