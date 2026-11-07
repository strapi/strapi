import { errors } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

import type {
  PermissionDiff,
  PermissionProblem,
  RoleDeleteResult,
  RoleDetail,
  RoleFile,
  RoleUpdateBody,
} from '../../../shared/contracts/roles';
import { PERMISSION_UID, PLUGIN_ID, ROLE_UID, USER_UID } from '../constants';
import type { RoleType } from '../content-types/role';
import {
  MAX_PERMISSIONS_PER_ROLE,
  MAX_STRING_LENGTH,
  formatLimit,
  permissionRefusal,
  refuseDuplicatePermissions,
  toPermissionRows,
  toStoredDiff,
} from '../utils/permission-row';
import type { PermissionRow } from '../utils/permission-row';
import { builderRecordsOf } from '../utils/builder/registry';
import { conditionsNaming } from '../utils/builder/usage';
import type { TransactionHooks } from '../utils/transaction-hooks';
import type abilityService from './ability';
import type permissionService from './permission';

/** A role as the services hand it out: no database id, only the `documentId`. */
export interface RoleRow {
  documentId: string;
  name: string;
  description: string | null;
  type: RoleType;
  requireTwoFactor: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleListItem extends RoleRow {
  usersCount: number;
}

/** The roles of a user, as much of each as the request pipeline needs. */
export interface RoleSummary {
  /** The database id, which the users-permissions compatibility mode shows. Prefer `documentId`. */
  id: number;
  documentId: string;
  name: string;
  description: string | null;
  type: RoleType;
  requireTwoFactor: boolean;
}

export interface RoleInput {
  name: string;
  description?: string | null;
  requireTwoFactor?: boolean;
  permissions?: PermissionRow[];
}

/**
 * What `get`, `update` and `create` answer, what an update takes, and what `delete` answers
 * (`shared/contracts/roles`). A delete also names the role it deleted, for the audit event.
 */
export type { RoleDetail, RoleUpdateBody };

export interface RoleDeleted extends RoleDeleteResult {
  name: string;
}

/** The save was built on an older copy of the role than the one stored: 409 `ROLE_CHANGED`. */
export class RoleChangedError extends errors.ApplicationError<
  'RoleChangedError',
  string,
  { code: 'ROLE_CHANGED' }
> {
  constructor() {
    super('This role was changed by someone else since it was loaded', { code: 'ROLE_CHANGED' });
    this.name = 'RoleChangedError';
  }
}

/**
 * What `toFile` writes and `fromFile` reads (`shared/contracts/roles`). Permissions are keyed by
 * action and subject, never by id, so a file means the same thing on any installation.
 */
export type { RoleFile };

const FILE_VERSION = 1;

/** What `ensureDefaults` reports: for each built-in role, whether that call inserted it. */
export interface EnsureDefaultsResult {
  created: { public: boolean; authenticated: boolean };
}

/** The roles every installation has, and what they are called: found by `type`, never by name. */
const BUILT_IN_ROLES: ReadonlyArray<{
  type: 'public' | 'authenticated';
  name: string;
  description: string;
}> = [
  {
    type: 'public',
    name: 'Public',
    description: 'Default role given to unauthenticated requests.',
  },
  {
    type: 'authenticated',
    name: 'Authenticated',
    description: 'Default role given to authenticated users.',
  },
];

/** Holders of a role read, and released from it, per round when it is deleted. */
const USERS_PAGE_SIZE = 500;

/**
 * The most users a role may have for it to be deleted: they are released one at a time, in one
 * transaction.
 */
const MAX_HOLDERS_ON_DELETE = 5_000;

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const refuse = (message: string): never => {
  throw new errors.ValidationError(message);
};

const toRole = (row: Plain): RoleRow => ({
  documentId: row.documentId as string,
  name: row.name as string,
  description: (row.description as string | null | undefined) ?? null,
  type: row.type as RoleType,
  requireTwoFactor: Boolean(row.requireTwoFactor),
  createdAt: row.createdAt as string,
  updatedAt: row.updatedAt as string,
});

/** What a create or an update of a role may carry. A role's `type` is never among it. */
const toRoleData = (input: unknown, { partial }: { partial: boolean }) => {
  if (!isPlain(input)) {
    return refuse('A role is an object');
  }

  const data: { name?: string; description?: string | null; requireTwoFactor?: boolean } = {};

  if (input.name !== undefined || !partial) {
    if (typeof input.name !== 'string' || input.name.trim() === '') {
      refuse('A role needs a name');
    }

    data.name = (input.name as string).trim();

    if (data.name.length > MAX_STRING_LENGTH) {
      refuse(`The name of a role is at most ${MAX_STRING_LENGTH} characters`);
    }
  }

  if (input.description !== undefined) {
    if (input.description !== null && typeof input.description !== 'string') {
      refuse('The description of a role is a string');
    }

    if (typeof input.description === 'string' && input.description.length > MAX_STRING_LENGTH) {
      refuse(`The description of a role is at most ${MAX_STRING_LENGTH} characters`);
    }

    data.description = input.description as string | null;
  }

  if (input.requireTwoFactor !== undefined) {
    if (typeof input.requireTwoFactor !== 'boolean') {
      refuse('requireTwoFactor is true or false');
    }

    data.requireTwoFactor = input.requireTwoFactor as boolean;
  }

  return data;
};

/** The revision a role is at. A role from before the column has none (null), which is 0. */
const revisionOf = (role: Plain): number => (role.revision as number | null | undefined) ?? 0;

/** The revision a save was built on: the one its editor loaded, and sends back. */
const toRevision = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return refuse(
      'A save carries the revision of the role it was built on (revision): a whole number, 0 or more'
    );
  }

  return value;
};

/** A row to update over the stored row it changes: what the row is once the diff is applied. */
const mergeRow = (stored: PermissionRow, changes: Partial<PermissionRow>): PermissionRow => ({
  action: changes.action ?? stored.action,
  subject: changes.subject === undefined ? stored.subject : changes.subject,
  properties: changes.properties ?? stored.properties,
  conditions: changes.conditions ?? stored.conditions,
});

const compareRows = (a: PermissionRow, b: PermissionRow) =>
  a.action.localeCompare(b.action) || (a.subject ?? '').localeCompare(b.subject ?? '');

/**
 * `strapi.plugin('end-users').service('role')`: the roles end users hold, and what they may do.
 *
 * Everything that must not end half done runs in one `strapi.db.transaction`: creating a role with
 * its permissions, changing both, and deleting a role after its users are moved.
 */
const roleService = ({ strapi }: { strapi: Core.Strapi }) => {
  const roleQuery = () => strapi.db.query(ROLE_UID);
  const userQuery = () => strapi.db.query(USER_UID);
  const roleDocuments = () => strapi.documents(ROLE_UID as UID.ContentType);
  const permission = () =>
    strapi.plugin(PLUGIN_ID).service('permission') as ReturnType<typeof permissionService>;

  const ability = () =>
    strapi.plugin(PLUGIN_ID).service('ability') as ReturnType<typeof abilityService>;

  /** Core's: the content type whose controller owns the action, or null */
  const subjectOf = (action: string): string | null =>
    strapi.contentAPI.permissions.subjectOf(action);

  const findByDocumentId = (documentId: string) =>
    roleQuery().findOne({ where: { documentId } }) as Promise<Plain | null>;

  // The oldest one: `type` is not unique in the database (there are many custom roles), so if a
  // second Public or Authenticated ever exists, every caller must still pick the same one
  const findByType = (type: RoleType) =>
    roleQuery().findOne({ where: { type }, orderBy: { id: 'asc' } }) as Promise<Plain | null>;

  const findOrThrow = async (documentId: string): Promise<Plain> => {
    const role = await findByDocumentId(documentId);

    if (!role) {
      throw new errors.NotFoundError('Role not found');
    }

    return role;
  };

  /** Users that hold the role: a count on the link table, `eu_users_roles_lnk`. */
  const countUsers = (documentId: string): Promise<number> =>
    userQuery().count({ where: { roles: { documentId } } });

  const get = async (documentId: string): Promise<RoleDetail> => {
    const role = await findOrThrow(documentId);
    const [rows, usersCount] = await Promise.all([
      permission().findForRoles([documentId]),
      countUsers(documentId),
    ]);

    // The rows the engine could no longer honour (an action, field or condition that has gone):
    // the editor sets them aside, and they are the ones a save of the role would refuse
    const problems: PermissionProblem[] = permission()
      .findProblems(rows)
      .map((problem) => ({ documentId: rows[problem.index].documentId, ...problem }));

    return {
      ...toRole(role),
      usersCount,
      revision: revisionOf(role),
      permissions: rows.map(({ documentId: id, action, subject, properties, conditions }) => ({
        documentId: id,
        action,
        subject,
        properties,
        conditions,
      })),
      problems,
      namedBy: conditionsNaming(builderRecordsOf(strapi), String(role.name)),
    };
  };

  const create = async (input: RoleInput): Promise<RoleDetail> => {
    const data = toRoleData(input, { partial: false });
    const { permissions } = input;

    if (permissions !== undefined && !Array.isArray(permissions)) {
      refuse('The permissions of a role are a list');
    }

    // Checked before anything is written: the bounds, then what each row names, then
    // the rows against each other. A row with no subject is on its action's content type, so it and
    // the same action on that type are one permission
    const rows = toPermissionRows(permissions ?? []);

    permission().checkRows(rows);
    refuseDuplicatePermissions(rows, subjectOf);

    const documentId = await strapi.db.transaction(async () => {
      // Always a custom role: Public and Authenticated exist from the first boot, and there is one
      // of each
      const created = await roleDocuments().create({ data: { ...data, type: 'custom' } });

      if (rows.length > 0) {
        await permission().applyDiff(created.documentId, { create: rows, update: [], delete: [] });
      }

      return created.documentId;
    });

    return get(documentId);
  };

  /**
   * Refuses a diff that has a row the engine could not trust, or that leaves the role with too many
   * permissions, naming the row. In the caller's transaction, after its revision step: the rows it
   * reads are the ones the diff is applied to. A row to update is checked as it would be once
   * changed, the changes over the stored row, and one that is not on the role is a 404. Deletes are
   * never checked.
   */
  const checkDiff = async (documentId: string, diff: PermissionDiff) => {
    if (diff.create.length === 0 && diff.update.length === 0) {
      return;
    }

    const stored = await permission().findForRoles([documentId]);

    if (diff.create.length > 0) {
      const deleted = new Set(diff.delete);
      const total =
        stored.filter((row) => !deleted.has(row.documentId)).length + diff.create.length;

      if (total > MAX_PERMISSIONS_PER_ROLE) {
        refuse(
          `A role has at most ${formatLimit(MAX_PERMISSIONS_PER_ROLE)} permissions, and this save would leave it with ${formatLimit(total)}`
        );
      }
    }

    const byId = new Map(stored.map((row) => [row.documentId, row]));
    const candidates: Array<{ part: 'create' | 'update'; n: number; row: PermissionRow }> = [
      ...diff.create.map((row, n) => ({ part: 'create' as const, n, row })),
      // A change to a row that is not on the role has no row to be merged over, and so no row to
      // check: it is refused as `applyDiff` would refuse it, never skipped to be written unchecked
      ...diff.update.map(({ documentId: id, ...changes }, n) => {
        const current = byId.get(id);

        if (current === undefined) {
          throw new errors.NotFoundError(`Permission ${id} not found on this role`);
        }

        return { part: 'update' as const, n, row: mergeRow(current, changes) };
      }),
    ];

    const [problem] = permission().findProblems(candidates.map(({ row }) => row));

    if (problem !== undefined) {
      const { part, n } = candidates[problem.index];

      throw permissionRefusal({ ...problem, index: n }, part);
    }
  };

  /** The role a user who is left with no other role is given: Authenticated, as `getDefault` says. */
  const findDefault = async (): Promise<Plain> => {
    const role = await findByType('authenticated');

    if (!role) {
      throw new errors.ApplicationError(
        'The default role (Authenticated) does not exist; it is created when the server starts'
      );
    }

    return role;
  };

  const refuseTooManyHolders = (role: Plain, count: number): never =>
    refuse(
      `${formatLimit(count)} users have the ${role.name as string} role: move its users to other roles first`
    );

  /**
   * Takes `role` from every user who holds it, in the caller's transaction, and gives the default
   * role to the ones left with no other. Answers how many were given it.
   *
   * It reads the first page of holders again until there are none (no cursor on the id): each user it
   * has dealt with no longer holds the role, so the next first page is the next holders, and one who
   * was given the role while it ran is met on a later page. A role that keeps getting holders is
   * given up on once more users than a delete accepts have gone through.
   */
  const releaseHolders = async (role: Plain): Promise<number> => {
    let defaultRole: Plain | undefined;
    let released = 0;
    let movedToDefault = 0;

    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const holders = (await userQuery().findMany({
        where: { roles: { id: role.id } },
        select: ['id'],
        populate: { roles: { select: ['id'] } },
        orderBy: { id: 'asc' },
        limit: USERS_PAGE_SIZE,
      })) as Array<{ id: number; roles: Array<{ id: number }> }>;

      if (holders.length === 0) {
        return movedToDefault;
      }

      released += holders.length;

      if (released > MAX_HOLDERS_ON_DELETE) {
        refuseTooManyHolders(role, released);
      }

      for (const user of holders) {
        const keepsARole = user.roles.some((held) => held.id !== role.id);

        // Only a user left with no role needs the default one
        if (!keepsARole && defaultRole === undefined) {
          // eslint-disable-next-line no-await-in-loop
          defaultRole = await findDefault();
        }

        // One at a time: they share the transaction, which is a single connection
        // eslint-disable-next-line no-await-in-loop
        await userQuery().update({
          where: { id: user.id },
          data: {
            roles: {
              ...(keepsARole ? {} : { connect: [{ id: (defaultRole as Plain).id }] }),
              disconnect: [{ id: role.id }],
            },
          },
        });

        if (!keepsARole) {
          movedToDefault += 1;
        }
      }
    }
  };

  return {
    /**
     * Creates Public and Authenticated when they are missing, and says which ones THIS call inserted.
     * Safe to run on every boot, and when two instances boot together: both can find the role missing
     * and both insert it, and the unique index on `name` refuses the second insert (a unique
     * violation from the database, or Strapi's own "must be unique" when it sees the other row
     * first). Whatever the second one is told, the role is there by then, so it is found by `type`
     * and accepted: that call reports the role as not created, and the one that won reports it as
     * created. If the role is still not there, the error was a real one and is thrown. A create that
     * throws is never reported as created, even when the role is there afterwards: the answer is for
     * callers that act once per role (bootstrap's default grants), and for them a doubt is a no.
     */
    async ensureDefaults(): Promise<EnsureDefaultsResult> {
      const created: EnsureDefaultsResult['created'] = { public: false, authenticated: false };

      for (const { type, name, description } of BUILT_IN_ROLES) {
        // eslint-disable-next-line no-await-in-loop
        if (await findByType(type)) {
          // eslint-disable-next-line no-continue
          continue;
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          await roleDocuments().create({ data: { name, description, type } });

          created[type] = true;
        } catch (error) {
          // eslint-disable-next-line no-await-in-loop
          if (!(await findByType(type))) {
            throw error;
          }
        }
      }

      return { created };
    },

    /** The role a new user is given: Authenticated. */
    async getDefault(): Promise<RoleRow> {
      return toRole(await findDefault());
    },

    async list(): Promise<RoleListItem[]> {
      const roles = (await roleQuery().findMany({ orderBy: { name: 'asc' } })) as Plain[];

      return Promise.all(
        roles.map(async (role) => ({
          ...toRole(role),
          usersCount: await countUsers(role.documentId as string),
        }))
      );
    },

    get,

    /**
     * A 404 for a role that is not there, and nothing else is checked: for a route that must say a
     * role is missing before it judges what was sent for it, so that every route answers the same.
     */
    async assertExists(documentId: string): Promise<void> {
      await findOrThrow(documentId);
    },

    create,

    /**
     * Saves a role: its name, description, two-factor rule and a diff of its permissions, or any of
     * them. `input.revision` is the revision of the role the save was built on. All of it runs in one
     * transaction:
     *
     * 1. the revision step: an `updateMany` of the role where its `id` and revision
     *    match, setting the revision plus one. No row changed is a `RoleChangedError`, and nothing is
     *    written. The write also locks the role's row, so two saves of one role run one after the
     *    other, and the second one's checks see the first one's rows;
     * 2. the import checks of the diff's created rows and of each updated row as it
     *    would be once changed (`permission.findProblems`), and the bound on the role's total;
     * 3. the writes.
     *
     * The shape of what was sent and the bounds of each row and list are checked before the
     * transaction opens.
     */
    async update(documentId: string, input: RoleUpdateBody): Promise<RoleDetail> {
      const data = toRoleData(input, { partial: true });
      const revision = toRevision(input.revision);
      // A role is changed by a diff; absent means the permissions stay as they are
      const diff = input.permissions === undefined ? undefined : toStoredDiff(input.permissions);

      await strapi.db.transaction(async ({ onCommit }: TransactionHooks) => {
        const role = await findOrThrow(documentId);

        // Public is what a request without credentials gets: nobody who signed in holds it
        if (role.type === 'public' && data.requireTwoFactor === true) {
          refuse('Public has no signed-in users');
        }

        // A role from before the column has no revision (null): that is 0
        const { count } = await roleQuery().updateMany({
          where: {
            id: role.id,
            ...(revision === 0
              ? { $or: [{ revision: 0 }, { revision: { $null: true } }] }
              : { revision }),
          },
          data: { revision: revision + 1 },
        });

        if (count === 0) {
          throw new RoleChangedError();
        }

        // A refused diff writes nothing but the revision, which the refusal undoes with it
        if (diff !== undefined) {
          await checkDiff(documentId, diff);
        }

        // The permissions the ability service keeps carry the name of their role
        onCommit(() => ability().invalidate());

        if (Object.keys(data).length > 0) {
          await roleDocuments().update({ documentId, data });
        }

        if (diff !== undefined) {
          await permission().applyDiff(documentId, diff);
        }
      });

      return get(documentId);
    },

    /**
     * Deletes a custom role and its permissions. Its users keep their other roles, and
     * a user left with none is given the default role: there is never a replacement to choose.
     * Public and Authenticated are never deleted, and a role with more than `MAX_HOLDERS_ON_DELETE`
     * users is refused until some of them are moved to other roles.
     *
     * The holders are released in the transaction (see `releaseHolders`), the ones left are counted
     * again just before the role goes, and a role somebody was given in the meantime is not deleted:
     * the whole delete is undone.
     */
    async delete(documentId: string): Promise<RoleDeleted> {
      return strapi.db.transaction(async ({ onCommit }: TransactionHooks) => {
        const role = await findOrThrow(documentId);

        if (role.type !== 'custom') {
          refuse(`The ${role.name as string} role cannot be deleted`);
        }

        const holders = await countUsers(documentId);

        if (holders > MAX_HOLDERS_ON_DELETE) {
          refuseTooManyHolders(role, holders);
        }

        const movedToDefault = await releaseHolders(role);

        if ((await countUsers(documentId)) > 0) {
          refuse(
            `A user was given the ${role.name as string} role while it was being deleted: nothing was deleted, try again`
          );
        }

        await strapi.db.query(PERMISSION_UID).deleteMany({ where: { role: { id: role.id } } });
        await roleDocuments().delete({ documentId });

        // Once this has committed, not before: the database layer reports each of the writes above
        // to the ability service as it runs, and a request that reads the role's permissions in
        // between would keep the old ones until they expire. Nothing is cleared on a rollback,
        // because nothing changed.
        onCommit(() => ability().invalidate());

        return { documentId, name: role.name as string, movedToDefault };
      });
    },

    /** The roles a user holds. None for a user that does not exist. */
    async getForUser(userDocumentId: string): Promise<RoleSummary[]> {
      const user = (await userQuery().findOne({
        where: { documentId: userDocumentId },
        populate: {
          roles: {
            select: ['id', 'documentId', 'name', 'description', 'type', 'requireTwoFactor'],
          },
        },
      })) as { roles?: Plain[] } | null;

      return (user?.roles ?? []).map((role) => ({
        id: role.id as number,
        documentId: role.documentId as string,
        name: role.name as string,
        description: (role.description as string | null | undefined) ?? null,
        type: role.type as RoleType,
        requireTwoFactor: Boolean(role.requireTwoFactor),
      }));
    },

    async toFile(documentId: string): Promise<RoleFile> {
      const { permissions, name, description, type, requireTwoFactor } = await get(documentId);

      return {
        version: FILE_VERSION,
        role: { name, description, type, requireTwoFactor },
        permissions: permissions
          .map(({ action, subject, properties, conditions }) => ({
            action,
            subject,
            properties,
            conditions,
          }))
          .sort(compareRows),
      };
    },

    /**
     * Creates a custom role from a file `toFile` wrote. The file's `type` is not applied: an import
     * is always a new custom role, never a second Public or Authenticated.
     *
     * A file comes from another installation, or from someone's editor, so `create` checks its rows
     * against this one before anything is written (`permission.checkRows`): actions its routes
     * have, fields its types have, conditions it has registered with the params they need. The
     * first row that breaks a rule is named in the error, and no role is created.
     */
    async fromFile(file: unknown): Promise<RoleDetail> {
      if (!isPlain(file) || file.version !== FILE_VERSION) {
        refuse(`Not a role file: expected a file with "version": ${FILE_VERSION}`);
      }

      const { role, permissions } = file as Plain;

      if (!isPlain(role)) {
        refuse('Not a role file: it has no role');
      }

      if (!Array.isArray(permissions)) {
        refuse('Not a role file: it has no list of permissions');
      }

      const { name, description, requireTwoFactor } = role as Plain;

      return create({ name, description, requireTwoFactor, permissions } as RoleInput);
    },
  };
};

export default roleService;
