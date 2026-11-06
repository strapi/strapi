import { errors } from '@strapi/utils';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import { RoleChangedError } from '../../services/role';
import type roleService from '../../services/role';
import type { RoleInput, RoleUpdateBody } from '../../services/role';
import { toPermissionDiff } from '../../utils/permission-row';

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const refuse = (message: string): never => {
  throw new errors.ValidationError(message);
};

/**
 * What a client may set on a role: its name, description, two-factor rule and permissions. The role's
 * `type` is not among them, and the service ignores it, so a client cannot make a second Public.
 */
const toRoleInput = (body: unknown): RoleInput => {
  if (!isPlain(body)) {
    return refuse('A role is an object');
  }

  const { name, description, requireTwoFactor, permissions } = body;

  return { name, description, requireTwoFactor, permissions } as RoleInput;
};

/**
 * The same, and the revision of the role the save was built on. The permissions of an update are a
 * diff, never the whole list: anything else is refused rather than ignored (`toPermissionDiff`), so
 * a client that sends a list, or a key this does not know, is not told its permissions were saved
 * when nothing changed.
 */
const toRoleUpdate = (body: unknown): RoleUpdateBody => {
  if (!isPlain(body)) {
    return refuse('A role is an object');
  }

  const { revision, name, description, requireTwoFactor, permissions } = body;

  return {
    revision,
    name,
    description,
    requireTwoFactor,
    // Absent stays absent: it means the permissions are left as they are
    permissions: permissions === undefined ? undefined : toPermissionDiff(permissions),
  } as RoleUpdateBody;
};

/** What an audit event says a save changed: the sizes of the diff, and none of its rows. */
interface DiffCounts {
  created: number;
  updated: number;
  deleted: number;
}

/**
 * `/end-users/roles`. Answers are `{ data }`, as every admin route does,
 * except the export: that is the role file itself, so what is saved from the response is what an
 * import reads back.
 *
 * Every write that changes a role tells `strapi.eventHub` once the service has resolved, so a write
 * that was refused or rolled back is never reported: `end-users.role.create`, `update`,
 * `delete` and `import`, with the admin who did it, the role's `documentId` and name, and how many
 * permissions it touched. No row, and no end-user data.
 */
const roleController = ({ strapi }: { strapi: Core.Strapi }) => {
  const roles = () => strapi.plugin(PLUGIN_ID).service('role') as ReturnType<typeof roleService>;

  const emit = (
    ctx: Koa.Context,
    event: 'create' | 'update' | 'delete' | 'import',
    role: { documentId: string; name: string },
    counts: DiffCounts | { movedToDefault: number }
  ) => {
    strapi.eventHub.emit(`end-users.role.${event}`, {
      adminUserId: ctx.state.user?.documentId,
      role: { documentId: role.documentId, name: role.name },
      counts,
    });
  };

  /** A role made whole from its rows: all of them are created. */
  const created = (permissions: unknown[]): DiffCounts => ({
    created: permissions.length,
    updated: 0,
    deleted: 0,
  });

  return {
    async find(ctx: Koa.Context) {
      ctx.body = { data: await roles().list() };
    },

    async findOne(ctx: Koa.Context) {
      ctx.body = { data: await roles().get(ctx.params.documentId) };
    },

    async create(ctx: Koa.Context) {
      const role = await roles().create(toRoleInput(ctx.request.body));

      emit(ctx, 'create', role, created(role.permissions));
      ctx.created({ data: role });
    },

    /**
     * A `PUT` with no `permissions` leaves them as they are. One built on a revision of the role
     * that is no longer the stored one is 409 `ROLE_CHANGED`: nothing was written, and the editor
     * keeps its edits. A role that does not exist is 404 before the body is looked at, as it is on
     * every role route.
     */
    async update(ctx: Koa.Context) {
      const { documentId } = ctx.params;

      // A role that is not there is a 404 whatever the body is: found before it is judged
      await roles().assertExists(documentId);

      const input = toRoleUpdate(ctx.request.body);

      try {
        const role = await roles().update(documentId, input);

        emit(ctx, 'update', role, {
          created: input.permissions?.create.length ?? 0,
          updated: input.permissions?.update.length ?? 0,
          deleted: input.permissions?.delete.length ?? 0,
        });
        ctx.body = { data: role };
      } catch (error) {
        if (error instanceof RoleChangedError) {
          ctx.conflict(error.message, error.details);

          return;
        }

        throw error;
      }
    },

    /**
     * Deleting a role never asks for another one: its users keep their other roles, and
     * a user left with none is given the default role. A `reassignTo` is refused rather than
     * ignored, so a client written for the old delete is not told its users went where it said.
     */
    async delete(ctx: Koa.Context) {
      const { documentId } = ctx.params;

      await roles().assertExists(documentId);

      if (ctx.query.reassignTo !== undefined) {
        refuse(
          'A role is deleted without reassignTo: its users keep their other roles, and a user left with none is given the default role'
        );
      }

      const { name, ...result } = await roles().delete(documentId);

      emit(ctx, 'delete', { documentId, name }, { movedToDefault: result.movedToDefault });
      ctx.body = { data: result };
    },

    async export(ctx: Koa.Context) {
      ctx.body = await roles().toFile(ctx.params.documentId);
    },

    /** The body is a file `export` wrote. It becomes a new custom role, whatever type the file says. */
    async import(ctx: Koa.Context) {
      const role = await roles().fromFile(ctx.request.body);

      emit(ctx, 'import', role, created(role.permissions));
      ctx.created({ data: role });
    },
  };
};

export default roleController;
