import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { runUnscoped } from '../scope/context';

const { ValidationError } = errors;

const asRoleIds = (value: unknown): number[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ValidationError('"roles" must be an array of role ids.');
  }

  return value.map((entry) => {
    const id = Number(entry);

    if (!Number.isInteger(id)) {
      throw new ValidationError('"roles" must contain role ids.');
    }

    return id;
  });
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Everyone who belongs to a space, with the roles they hold there. */
  async find(ctx: Context) {
    const spaceId = Number(ctx.params.spaceId);
    await strapi.service('plugin::spaces.access').assertCanActOn(ctx, spaceId);

    const memberships = await strapi.service('plugin::spaces.membership').listForSpace(spaceId);

    ctx.body = {
      data: memberships.map(
        (membership: { id: number; user: Record<string, unknown>; roles: unknown[] }) => ({
          id: membership.id,
          user: pickUser(membership.user),
          roles: membership.roles,
        })
      ),
    };
  },

  async upsert(ctx: Context) {
    const spaceId = Number(ctx.params.spaceId);
    await strapi.service('plugin::spaces.access').assertCanActOn(ctx, spaceId);

    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const userId = Number(body.user);

    if (!Number.isInteger(userId)) {
      throw new ValidationError('"user" must be a user id.');
    }

    const membership = await strapi.service('plugin::spaces.membership').upsert({
      spaceId,
      userId,
      roleIds: asRoleIds(body.roles),
    });

    ctx.body = { data: membership };
  },

  async remove(ctx: Context) {
    const spaceId = Number(ctx.params.spaceId);
    await strapi.service('plugin::spaces.access').assertCanActOn(ctx, spaceId);

    const userId = Number(ctx.params.userId);

    await strapi.service('plugin::spaces.membership').remove(userId, spaceId);

    ctx.body = { data: { userId, spaceId } };
  },

  /**
   * Administrators who could be added to this space.
   *
   * Listing users is an administrative act on the platform's identities, not on
   * the space, which is why the route requires the same permission as managing
   * users elsewhere and returns only what is needed to pick one.
   */
  async candidates(ctx: Context) {
    const spaceId = Number(ctx.params.spaceId);
    await strapi.service('plugin::spaces.access').assertCanActOn(ctx, spaceId);

    const [users, memberships] = await Promise.all([
      runUnscoped(() =>
        strapi.db.query('admin::user').findMany({
          where: { isActive: true },
          populate: { roles: true },
          limit: -1,
        })
      ),
      strapi.service('plugin::spaces.membership').listForSpace(spaceId),
    ]);

    const alreadyMembers = new Set(
      memberships.map((membership: { user: { id: number } }) => membership.user.id)
    );

    ctx.body = {
      data: users.filter((user: { id: number }) => !alreadyMembers.has(user.id)).map(pickUser),
    };
  },
});

/**
 * Only what the membership screens need. Administering a space must not become
 * a way to read the platform's user records.
 */
const pickUser = (user: Record<string, unknown> | undefined) =>
  user
    ? {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        roles: user.roles,
      }
    : null;
