import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { MEMBERSHIP_UID, type Space } from '../../../shared/constants';
import { runUnscoped } from '../scope/context';

const { ApplicationError, NotFoundError } = errors;

export interface Membership {
  id: number;
  space: Space;
  user: { id: number };
  roles: Array<{ id: number; name?: string; code?: string }>;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * Memberships decide who may enter a space and with which roles, so they are
   * read on the authentication path of every admin request. They are cached per
   * user, briefly, and dropped whole on any membership write.
   *
   * The TTL is the upper bound on how long a removed member keeps working in a
   * space on this process, and the reason it is measured in seconds.
   */
  const CACHE_TTL_MS = 10_000;
  const cache = new Map<number, { at: number; memberships: Membership[] }>();

  const invalidate = (userId?: number) => {
    if (userId === undefined) {
      cache.clear();
    } else {
      cache.delete(userId);
    }
  };

  const query = () => strapi.db.query(MEMBERSHIP_UID);

  const service = {
    invalidate,

    /** Every space this user belongs to, with the roles they hold in each. */
    async listForUser(userId: number): Promise<Membership[]> {
      const cached = cache.get(userId);

      if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.memberships;
      }

      const memberships: Membership[] = await runUnscoped(() =>
        query().findMany({
          where: { user: userId },
          populate: { space: true, roles: true },
          limit: -1,
        })
      );

      // A membership of an archived space is not usable, and leaving it in
      // would let a caller keep working in a space that was turned off.
      const usable = memberships.filter((membership) => membership.space?.status === 'active');

      cache.set(userId, { at: Date.now(), memberships: usable });

      return usable;
    },

    async listForSpace(spaceId: number): Promise<Membership[]> {
      return runUnscoped(() =>
        query().findMany({
          where: { space: spaceId },
          populate: { user: true, roles: true },
          limit: -1,
        })
      );
    },

    async find(userId: number, spaceId: number): Promise<Membership | undefined> {
      const memberships = await service.listForUser(userId);

      return memberships.find((membership) => membership.space.id === spaceId);
    },

    async isMember(userId: number, spaceId: number): Promise<boolean> {
      return Boolean(await service.find(userId, spaceId));
    },

    /**
     * Adds a user to a space, or updates the roles they hold there.
     *
     * Roles are optional: a membership with none means the user keeps whatever
     * roles they hold platform-wide, which is the common setup and the one that
     * behaves like Strapi without Spaces.
     */
    async upsert(input: {
      userId: number;
      spaceId: number;
      roleIds?: number[];
    }): Promise<Membership> {
      const space = await strapi.service('plugin::spaces.spaces').findById(input.spaceId);

      if (!space) {
        throw new NotFoundError(`Space ${input.spaceId} does not exist.`);
      }

      const user = await runUnscoped(() =>
        strapi.db.query('admin::user').findOne({ where: { id: input.userId } })
      );

      if (!user) {
        throw new NotFoundError(`User ${input.userId} does not exist.`);
      }

      if (input.roleIds?.length) {
        const found = await runUnscoped(() =>
          strapi.db.query('admin::role').findMany({ where: { id: { $in: input.roleIds } } })
        );

        if (found.length !== input.roleIds.length) {
          throw new ApplicationError('One of the given roles does not exist.');
        }
      }

      const existing = await runUnscoped(() =>
        query().findOne({ where: { user: input.userId, space: input.spaceId } })
      );

      const data = {
        user: input.userId,
        space: input.spaceId,
        roles: input.roleIds ?? [],
      };

      const membership = existing
        ? await runUnscoped(() =>
            query().update({ where: { id: existing.id }, data, populate: { roles: true } })
          )
        : await runUnscoped(() => query().create({ data, populate: { roles: true } }));

      invalidate(input.userId);
      strapi.eventHub.emit('spaces.membership.update', { membership });

      return membership;
    },

    async remove(userId: number, spaceId: number): Promise<void> {
      await runUnscoped(() => query().deleteMany({ where: { user: userId, space: spaceId } }));

      invalidate(userId);
      strapi.eventHub.emit('spaces.membership.delete', { userId, spaceId });
    },

    async removeAllForSpace(spaceId: number): Promise<void> {
      await runUnscoped(() => query().deleteMany({ where: { space: spaceId } }));

      invalidate();
    },

    async removeAllForUser(userId: number): Promise<void> {
      await runUnscoped(() => query().deleteMany({ where: { user: userId } }));

      invalidate(userId);
    },

    /**
     * The roles a user holds in a space: the ones their membership names, or —
     * when the membership names none — the roles they hold platform-wide.
     */
    async getEffectiveRoleIds(userId: number, spaceId: number): Promise<number[] | null> {
      const membership = await service.find(userId, spaceId);

      if (!membership) {
        return [];
      }

      if (!membership.roles?.length) {
        return null;
      }

      return membership.roles.map((role) => role.id);
    },
  };

  return service;
};
