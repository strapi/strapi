import type Koa from 'koa';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { USER_SECURITY_ACTIONS } from '../../admin-actions';
import { PLUGIN_ID, USER_UID } from '../../constants';
import { engineOwnedUserFields } from '../../utils/engine-owned-user-fields';
import { isPlain } from '../../utils/is-plain';
import { normalizeEmail } from '../../utils/normalize-email';

type Plain = Record<string, unknown>;

/** The name this controller has in the plugin, and what the Content Manager's layout refers to */
const CONTROLLER = 'user-write-guard';

/**
 * The Content Manager's actions that carry a document's data in the request body: the ones that
 * can set a field of the user.
 */
const GUARDED_ACTIONS = ['create', 'update', 'publish', 'clone'] as const;

type GuardedAction = (typeof GUARDED_ACTIONS)[number];

/**
 * The user fields only the Security panel's actions change: the engine-owned ones (the two-factor
 * flag, the ban, the lockout, `emailVerified`, and what a project's Better Auth plugins add) and the
 * address, which takes an account over together with `emailVerified`.
 */
const guardedFields = (strapi: Core.Strapi): string[] => {
  const attributes = strapi.contentType(USER_UID)?.attributes as Parameters<
    typeof engineOwnedUserFields
  >[0];

  return [...new Set<string>([...engineOwnedUserFields(attributes), 'email'])];
};

const isMissing = (value: unknown) => value === undefined || value === null;

/**
 * Whether a write that gives `given` for `field` leaves it as it is (`current`). The editor sends a
 * whole document back, so a field the administrator did not touch must not count: a missing value
 * and `null` are the same, a date is compared as a moment, an address as it is stored.
 */
const leavesAsIs = (field: string, given: unknown, current: unknown): boolean => {
  if (isMissing(given) || isMissing(current)) {
    return isMissing(given) && isMissing(current);
  }

  if (field === 'email' && typeof given === 'string' && typeof current === 'string') {
    return normalizeEmail(given) === normalizeEmail(current);
  }

  if (current instanceof Date || given instanceof Date) {
    return (
      new Date(given as string | number | Date).getTime() ===
      new Date(current as string | number | Date).getTime()
    );
  }

  return given === current;
};

/**
 * Guards the Content Manager's writes of an end user. The Security panel's changes (reset two-factor,
 * unban, unlock) need the plugin's `security.manage`, but the same fields are ordinary attributes of
 * the user, and the Content Manager writes whatever the administrator's field permissions allow.
 * Without this, `explorer.update` alone would do by that road what `security.manage` guards.
 *
 * The Content Manager runs it through its own extension point for a content type's actions (the
 * plugin's `layout.user.actions.<action>`, see `registerUserWriteGuard`), after it has authenticated
 * the administrator and checked their Content Manager permission, so `userAbility` is theirs. A
 * write that gives a guarded field a value it does not already have is a 403 unless the administrator
 * holds `security.manage`; a write that leaves them as they are, or does not carry them, goes on to
 * the Content Manager unchanged. The address is free on a create, since a user needs one.
 */
const userWriteGuardController = ({ strapi }: { strapi: Core.Strapi }) => {
  const guard = (action: GuardedAction) => async (ctx: Koa.Context, next: Koa.Next) => {
    const body = (ctx.request as { body?: unknown }).body;

    if (!isPlain(body)) {
      return next();
    }

    const given = guardedFields(strapi).filter(
      (field) => Object.hasOwn(body, field) && !(field === 'email' && action === 'create')
    );

    if (given.length === 0) {
      return next();
    }

    const ability = ctx.state.userAbility as { can?(action: string): boolean } | undefined;

    if (ability?.can?.(USER_SECURITY_ACTIONS.manage)) {
      return next();
    }

    // What a field is now: the stored user for a write of one, the type's default for a new one
    const { id } = ctx.params;
    const stored =
      typeof id === 'string'
        ? ((await strapi.db
            .query(USER_UID)
            .findOne({ where: { documentId: id }, select: given })) as Plain | null)
        : null;
    const attributes = (strapi.contentType(USER_UID)?.attributes ?? {}) as Record<
      string,
      { default?: unknown } | undefined
    >;
    const refused = given.filter(
      (field) =>
        !leavesAsIs(field, body[field], stored ? stored[field] : attributes[field]?.default)
    );

    if (refused.length > 0) {
      throw new errors.PolicyError(
        `Changing ${refused.join(', ')} needs the permission to manage the Security panel of end users`,
        { fields: refused }
      );
    }

    return next();
  };

  return {
    create: guard('create'),
    update: guard('update'),
    publish: guard('publish'),
    clone: guard('clone'),
  };
};

/**
 * Hooks the guard into the Content Manager: its routing step looks for
 * `plugin::end-users.layout.user.actions.<action>` before it runs the action on a collection type of
 * a plugin, and runs the controller it names, with the action as `next`. The end-user type is the
 * plugin's, so these are its keys. Set unconditionally: a value from the project would take the
 * guard away.
 */
export const registerUserWriteGuard = (strapi: Core.Strapi) => {
  for (const action of GUARDED_ACTIONS) {
    strapi.config.set(
      `plugin::${PLUGIN_ID}.layout.user.actions.${action}`,
      `${CONTROLLER}.${action}`
    );
  }
};

export default userWriteGuardController;
