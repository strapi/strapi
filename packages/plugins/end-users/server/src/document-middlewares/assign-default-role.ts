import type { Core, Modules } from '@strapi/types';

import { PLUGIN_ID, ROLE_UID, USER_UID } from '../constants';
import type roleService from '../services/role';
import type settingsService from '../services/settings';

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Whether a value can be the id of a role: a string that is not empty, or a positive whole number.
 * `''`, `0`, `NaN`, a negative number and a fraction are not ids: none of them names a role.
 */
const isKey = (value: unknown) =>
  (typeof value === 'string' && value !== '') ||
  (typeof value === 'number' && Number.isInteger(value) && value > 0);

/** A single relation as an object: `{ documentId }` or `{ id }`, which the Document Service takes. */
const isLonghand = (value: Plain) => isKey(value.documentId) || isKey(value.id);

/**
 * Whether a relation value names at least one entry: a list with an entry in it, one id, or one
 * longhand object. This is also what `connect` and `set` may be: the Document Service takes a lone
 * value there as well as a list.
 *
 * A list counts by what is in it, not by its length. The Document Service drops only the entries
 * that map to nothing (`null`, `undefined`, `NaN`); an entry such as `''`, `0`, `-1` or `1.5` would
 * make the create fail or link nothing. None of these names a role, so a list of only such entries
 * is no choice, like `[]`, and the create gets the default role.
 */
const hasEntries = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some(hasEntries);
  }

  return isPlain(value) ? isLonghand(value) : isKey(value);
};

/**
 * Whether a create chose any role, in any shape the Document Service accepts for a relation: a list
 * or a lone id, a lone `{ documentId }` or `{ id }`, or an object with a `connect` or a `set` (a
 * list, or a lone id or object). An absent `roles`, an empty list, a list of nothing but falsy
 * entries, `null`, and an object that connects nothing, as the Content Manager sends for a relation
 * field left untouched, all say that no role was chosen.
 *
 * When `set` is there it decides alone: both the Document Service and the database layer give it
 * precedence over `connect`, so `{ connect: ['a'], set: [] }` ends with no roles, and is no choice.
 * A `set` that is `null` or `undefined` is not there.
 */
const choosesRoles = (roles: unknown): boolean => {
  if (isPlain(roles) && !isLonghand(roles)) {
    const { connect, set } = roles;

    return set ? hasEntries(set) : hasEntries(connect);
  }

  return hasEntries(roles);
};

/**
 * `assign-default-role`: a user made without roles is made with the default ones: the roles the
 * Sign-in settings name (`signUp.defaultRoles`), or Authenticated when none is set.
 *
 * It is the same create: the role is connected in the data the Document Service writes, so the user
 * and its role are written together or not at all, and whatever creates a user gets it (Better
 * Auth's sign-up, an OAuth callback, a magic link, the Content Manager, a script). Roles the caller
 * chose are the caller's, and are left as they are; a create that chose none gets the default,
 * whether it left `roles` out or sent an empty list or an empty `connect`.
 *
 * A default role that has been deleted since it was chosen is left out; when none of them is left
 * the user gets Authenticated. It fails the create when that role does not exist, rather than make
 * a user nobody can give permissions: the role is created when the server starts.
 */
export const assignDefaultRoleMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (ctx, next) => {
    if (ctx.uid !== USER_UID || ctx.action !== 'create') {
      return next();
    }

    const params = ctx.params as { data?: Record<string, unknown> | null } | undefined;
    const data = params?.data;

    if (!params || !data || choosesRoles(data.roles)) {
      return next();
    }

    const plugin = strapi.plugin(PLUGIN_ID);
    const { signUp } = await (
      plugin.service('settings') as ReturnType<typeof settingsService>
    ).get();
    const chosen = [...new Set(signUp.defaultRoles)];
    const existing = chosen.length
      ? ((await strapi.db.query(ROLE_UID).findMany({
          where: { documentId: { $in: chosen } },
          select: ['documentId'],
        })) as Array<{ documentId: string }>)
      : [];
    const found = new Set(existing.map((role) => role.documentId));
    let ids = chosen.filter((id) => found.has(id));

    if (ids.length === 0) {
      ids = [
        (await (plugin.service('role') as ReturnType<typeof roleService>).getDefault()).documentId,
      ];
    }

    // A copy: the object belongs to the caller
    params.data = { ...data, roles: { connect: ids } };

    return next();
  };
