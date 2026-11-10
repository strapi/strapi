import { contentTypes, errors } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { PERMISSION_UID, PLUGIN_ID, PROFILE_UID, ROLE_UID, USER_UID } from '../constants';
import type permissionService from './permission';
import type { StoredPermission } from './permission';
import type { RoleSummary } from './role';
import { isPlain } from '../utils/is-plain';
import { documentsOf, type PluginDocuments } from '../utils/typed-strapi';

type ContentApiAbility = Modules.ContentAPI.ContentApiAbility;
type ConditionUser = Modules.ContentAPI.ConditionUser;
type Model = Parameters<typeof contentTypes.isPrivateAttribute>[0];

/**
 * A role the caller holds, as far as `forUser` reads it: what `role.getForUser` gives
 * (`RoleSummary`), of which only the `documentId` is needed.
 */
export type AbilityRole = Pick<RoleSummary, 'documentId'> &
  Partial<Omit<RoleSummary, 'documentId'>>;

/** A role as `describe` gives it to a front end */
export interface CallerRole {
  documentId: string;
  name: string;
  type: string;
}

/** What `describe` gives: core's description of the caller, and the roles they hold */
export interface CallerPermissions extends Modules.ContentAPI.PermissionsDescription {
  roles: CallerRole[];
}

const toCallerRole = ({ documentId, name, type }: CallerRole): CallerRole => ({
  documentId,
  name,
  type,
});

/**
 * How long the permissions of a role are kept before they are read again. A change made on this
 * instance clears them at once (see `invalidate`); this is what bounds how long another instance
 * of a multi-instance deployment keeps serving the old ones.
 */
export const PERMISSIONS_TTL_MS = 30_000;

interface CachedRole {
  rows: StoredPermission[];
  expiresAt: number;
}

/**
 * `strapi.plugin('end-users').service('ability')`: what a caller may do on the Content API,
 * as the ability core's `generateAbility` builds: route scopes, and the data rules of the rows that
 * name a content type.
 *
 * The permissions of a role are kept in memory, keyed by the role's `documentId`: they are read on
 * every request and change rarely. An ability is not kept: it is built per request from the rows,
 * which is cheap, and which leaves nothing to invalidate when two roles are combined differently.
 */
const abilityService = ({ strapi }: { strapi: Core.Strapi }) => {
  const permission = () =>
    strapi.plugin(PLUGIN_ID).service('permission') as ReturnType<typeof permissionService>;

  const cache = new Map<string, CachedRole>();
  let publicRole: { role: CallerRole; expiresAt: number } | undefined;

  /**
   * Bumped by every invalidation. A read that was already under way when one happened may hold
   * rows from before the change, and must not be put back into the cache.
   */
  let generation = 0;

  const invalidate = () => {
    generation += 1;
    cache.clear();
    publicRole = undefined;
  };

  /*
   * Writes to a role or to its permissions, as the database layer reports them rather than as the
   * calls that make them. `permission.applyDiff` is one such write, and so are deleting a role
   * (which removes its permissions directly) and anything a project does through the Document
   * Service. A role's own row is only read for its name, so only a change to an existing role counts.
   *
   * The services of a plugin are built when first used, which is before anything is cached.
   */
  strapi.db.lifecycles.subscribe({
    models: [PERMISSION_UID],
    afterCreate: invalidate,
    afterCreateMany: invalidate,
    afterUpdate: invalidate,
    afterUpdateMany: invalidate,
    afterDelete: invalidate,
    afterDeleteMany: invalidate,
  });

  strapi.db.lifecycles.subscribe({
    models: [ROLE_UID],
    afterUpdate: invalidate,
    afterUpdateMany: invalidate,
    afterDelete: invalidate,
    afterDeleteMany: invalidate,
  });

  /** The Public role, found by type: what a request without credentials is given. */
  const findPublicRole = async (): Promise<CallerRole | null> => {
    if (publicRole && publicRole.expiresAt > Date.now()) {
      return publicRole.role;
    }

    const startedAt = generation;
    // The oldest: `type` is not unique, and the role service picks the same one (see its findByType)
    const role = (await strapi.db.query(ROLE_UID).findOne({
      where: { type: 'public' },
      select: ['documentId', 'name', 'type'],
      orderBy: { id: 'asc' },
    })) as CallerRole | null;

    if (!role) {
      // Not remembered when missing: it is made at boot, and that must not stay missing for 30 s
      return null;
    }

    const found = toCallerRole(role);

    if (startedAt === generation) {
      publicRole = { role: found, expiresAt: Date.now() + PERMISSIONS_TTL_MS };
    }

    return found;
  };

  /** The permissions of these roles, each role read from the database only when not kept. */
  const permissionsOf = async (roleDocumentIds: string[]): Promise<StoredPermission[]> => {
    const rowsByRole = new Map<string, StoredPermission[]>();
    const missing: string[] = [];
    const now = Date.now();

    for (const id of roleDocumentIds) {
      const hit = cache.get(id);

      if (hit && hit.expiresAt > now) {
        rowsByRole.set(id, hit.rows);
      } else {
        missing.push(id);
      }
    }

    if (missing.length > 0) {
      const startedAt = generation;
      const found = await permission().findForRoles(missing);

      for (const id of missing) {
        rowsByRole.set(id, []);
      }

      for (const row of found) {
        rowsByRole.get(row.roleDocumentId)?.push(row);
      }

      if (startedAt === generation) {
        const expiresAt = Date.now() + PERMISSIONS_TTL_MS;

        // A role with no permissions is kept too: it would be asked for again on every request
        for (const id of missing) {
          cache.set(id, { rows: rowsByRole.get(id) as StoredPermission[], expiresAt });
        }
      }
    }

    return roleDocumentIds.flatMap((id) => rowsByRole.get(id) ?? []);
  };

  /**
   * Who the conditions of a request are evaluated for: the user's row, the attributes the end-user
   * type keeps private left out (`banned`, `banReason`, `banExpires`, `role`, and whatever the
   * project makes private), with the roles they hold. `$user.<attribute>` reads it. Only the
   * attributes of the end-user type are taken, and when that type isn't the one registered, none:
   * the identity and the roles are enough for `$user.documentId` and `$user.roles.documentId`.
   */
  const toConditionUser = (
    user: Record<string, unknown>,
    roles: readonly AbilityRole[]
  ): ConditionUser => {
    const schema: unknown = strapi.contentType(USER_UID as UID.ContentType);
    const model =
      isPlain(schema) && schema.uid === USER_UID ? (schema as unknown as Model) : undefined;
    const attributes = isPlain(model?.attributes) ? model.attributes : {};

    const readable = Object.entries(user).filter(
      ([name]) =>
        model !== undefined &&
        Object.prototype.hasOwnProperty.call(attributes, name) &&
        !contentTypes.isPrivateAttribute(model, name)
    );

    // Set last, so an attribute of the same name never replaces them
    return {
      ...Object.fromEntries(readable),
      uid: USER_UID,
      id: user.id as number,
      documentId: user.documentId as string,
      roles: roles.map(({ documentId, name, type }) => ({ documentId, name, type })),
    };
  };

  /**
   * The user's profile as `$profile.*` reads it: its public attributes, its to-one relations as
   * `{ documentId }` (what `$profile.<relation>.documentId` needs), and no to-many relation,
   * media or component. `null` when the user has no profile.
   */
  const loadProfile = async (
    userDocumentId: string,
    scope?: object
  ): Promise<Record<string, unknown> | null> => {
    const schema: unknown = strapi.contentType(PROFILE_UID as UID.ContentType);
    const model = isPlain(schema) ? (schema as unknown as Model) : undefined;
    const attributes = (isPlain(model?.attributes) ? model.attributes : {}) as Record<
      string,
      Record<string, unknown>
    >;

    const isToOne = (attribute: Record<string, unknown>) =>
      attribute.type === 'relation' &&
      typeof attribute.relation === 'string' &&
      ['oneToOne', 'manyToOne'].includes(attribute.relation);
    const isPublic = (name: string) =>
      model !== undefined && !contentTypes.isPrivateAttribute(model, name);

    const toOne = Object.keys(attributes).filter(
      (name) => isPublic(name) && isToOne(attributes[name])
    );

    const found = (await documentsOf<PluginDocuments>(strapi, PROFILE_UID).findFirst({
      filters: scope
        ? { $and: [{ user: { documentId: userDocumentId } }, scope] }
        : { user: { documentId: userDocumentId } },
      populate: Object.fromEntries(toOne.map((name) => [name, { fields: ['documentId'] }])),
    })) as Record<string, unknown> | null;

    if (!found) {
      return null;
    }

    const profile: Record<string, unknown> = {};

    for (const [name, attribute] of Object.entries(attributes)) {
      if (!isPublic(name) || !Object.prototype.hasOwnProperty.call(found, name)) {
        continue;
      }

      if (isToOne(attribute)) {
        const related = found[name];

        profile[name] =
          isPlain(related) && typeof related.documentId === 'string'
            ? { documentId: related.documentId }
            : null;
      } else if (
        !['relation', 'media', 'component', 'dynamiczone', 'password'].includes(
          String(attribute.type)
        )
      ) {
        profile[name] = found[name];
      }
    }

    // Set last, so an attribute of the same name never replaces it
    return { ...profile, documentId: found.documentId };
  };

  return {
    /**
     * The ability of a request: core's `generateAbility` over the permissions of the caller's
     * roles, each row with the name of its role. Route scopes are answered from the rows' actions,
     * as for an API token; the rows that name a content type also give data rules (fields,
     * conditions, populate depth), which core's sanitizers and validators read.
     *
     * With a user, the ability is the union of what `roles` allow: one ability, whatever the number
     * of roles, and only the roles given (Public's permissions are not added to a user's).
     * Conditions are evaluated for that user (`toConditionUser`): pass the row as read from the
     * end-user type, not the credentials, which carry too few attributes for `$user.<attribute>`.
     * With `null`, the request has no credentials: it is given the Public role, `roles` is not read,
     * and every condition that needs a user is false. No permissions at all is a valid ability, one
     * that allows nothing.
     *
     * The user's profile is loaded once, as `conditionUser.profile`, only when a registered
     * condition reads it (`conditions.readsProfile()`); it is `null` when the user has none.
     *
     * Conditions are evaluated per request, from the rows kept below, so nothing about them needs
     * invalidating.
     */
    async forUser(
      user: Record<string, unknown> | null,
      roles: readonly AbilityRole[]
    ): Promise<ContentApiAbility> {
      let roleDocumentIds: string[];

      if (user === null) {
        const role = await findPublicRole();

        roleDocumentIds = role ? [role.documentId] : [];
      } else {
        roleDocumentIds = [...new Set(roles.map((role) => role.documentId))];
      }

      const rows = await permissionsOf(roleDocumentIds);

      let conditionUser: ConditionUser | null = null;

      if (user !== null) {
        conditionUser = toConditionUser(user, roles);

        // Once per request, and only when a registered condition reads it
        if (strapi.contentAPI.permissions.conditions.readsProfile()) {
          conditionUser.profile = await loadProfile(conditionUser.documentId);
        }
      }

      return strapi.contentAPI.permissions.generateAbility(
        rows.map(({ action, subject, properties, conditions, roleName }) => ({
          action,
          subject,
          properties,
          conditions,
          origin: { role: roleName },
        })),
        { user: conditionUser }
      );
    },

    /**
     * What the caller of a request holds, for a front end (`GET /api/end-users/permissions/me`):
     * core's `describe` of the request's ability (the route scopes, and per content type and action
     * the fields, conditions and populate depth of the rows held) and the roles it comes from. A
     * signed-in user's roles are the ones on their credentials; Public's is the Public role, from
     * the same lookup as its ability.
     */
    async describe(auth: unknown): Promise<CallerPermissions> {
      const { credentials } = (isPlain(auth) ? auth : {}) as { credentials?: unknown };
      let roles: CallerRole[];

      if (credentials === null || credentials === undefined) {
        const role = await findPublicRole();

        // A copy: the kept role is shared by every request
        roles = role ? [toCallerRole(role)] : [];
      } else {
        const held = isPlain(credentials) ? credentials.roles : undefined;

        roles = Array.isArray(held) ? (held as CallerRole[]).map(toCallerRole) : [];
      }

      return { roles, ...strapi.contentAPI.permissions.describe(auth) };
    },

    /**
     * Who a condition is previewed for (the builder's preview): the end user with this
     * `documentId`, as `forUser` gives them to a condition, with the roles they hold. Found within
     * `userQuery`, the admin's Content Manager read query on the end-user type, so an admin is
     * never given a user they can't see: that is a `NotFoundError`, the same as a user who doesn't
     * exist.
     */
    async conditionUserFor(
      userDocumentId: string,
      userQuery: object,
      { profile = false, profileQuery }: { profile?: boolean; profileQuery?: object } = {}
    ): Promise<ConditionUser> {
      const user = (await documentsOf<PluginDocuments>(strapi, USER_UID).findFirst({
        filters: { $and: [{ documentId: userDocumentId }, userQuery] },
        populate: { roles: { fields: ['documentId', 'name', 'type'] } },
      })) as Record<string, unknown> | null;

      if (!user) {
        throw new errors.NotFoundError('User not found');
      }

      const conditionUser = toConditionUser(
        user,
        Array.isArray(user.roles) ? (user.roles as AbilityRole[]) : []
      );

      // As `forUser` does, when the condition being previewed reads it
      if (profile) {
        conditionUser.profile = await loadProfile(conditionUser.documentId, profileQuery);
      }

      return conditionUser;
    },

    /**
     * Forgets every kept permission, so the next request reads them again. Done for you whenever a
     * role or its permissions are written; call it when something else changes what they mean.
     */
    invalidate,
  };
};

export default abilityService;
