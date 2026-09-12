import createMembershipService from '../membership';

const FRANCE = { id: 1, slug: 'fr', status: 'active' };
const ARCHIVED = { id: 2, slug: 'old', status: 'archived' };

type Row = {
  id: number;
  user: number;
  space: typeof FRANCE;
  roles: Array<{ id: number }>;
};

interface Options {
  rows?: Row[];
  users?: number[];
  roles?: number[];
  spaces?: Record<number, { id: number; slug: string } | undefined>;
}

const makeStrapi = ({
  rows = [],
  users = [7],
  roles = [1, 2],
  spaces = { 1: FRANCE, 2: ARCHIVED },
}: Options = {}) => {
  const table = rows.map((row) => ({ ...row }));
  let nextId = table.length + 1;
  const reads = { memberships: 0 };
  const emitted: Array<[string, unknown]> = [];

  const matches = (row: Row, where: Record<string, unknown>) =>
    (where.user === undefined || row.user === where.user) &&
    (where.space === undefined || row.space.id === where.space) &&
    (where.id === undefined || row.id === where.id);

  const membershipQuery = {
    async findMany({ where = {} }: { where?: Record<string, unknown> } = {}) {
      reads.memberships += 1;

      return table.filter((row) => matches(row, where));
    },
    findOne: async ({ where = {} }: { where?: Record<string, unknown> } = {}) =>
      table.find((row) => matches(row, where)),
    async create({ data }: { data: Record<string, any> }) {
      const row = {
        id: nextId,
        user: data.user,
        space: spaces[data.space] as typeof FRANCE,
        roles: (data.roles ?? []).map((id: number) => ({ id })),
      };
      nextId += 1;
      table.push(row);

      return row;
    },
    async update({ where, data }: { where: { id: number }; data: Record<string, any> }) {
      const row = table.find((entry) => entry.id === where.id)!;
      row.roles = (data.roles ?? []).map((id: number) => ({ id }));

      return row;
    },
    async deleteMany({ where = {} }: { where?: Record<string, unknown> } = {}) {
      const kept = table.filter((row) => !matches(row, where));
      const count = table.length - kept.length;
      table.splice(0, table.length, ...kept);

      return { count };
    },
  };

  const strapi = {
    requestContext: { get: () => undefined },
    eventHub: {
      emit(event: string, payload: unknown) {
        emitted.push([event, payload]);
      },
    },
    service: () => ({ findById: async (id: number) => spaces[id] }),
    db: {
      query(uid: string) {
        if (uid === 'admin::user') {
          return {
            findOne: async ({ where }: { where: { id: number } }) =>
              users.includes(where.id) ? { id: where.id } : null,
          };
        }

        if (uid === 'admin::role') {
          return {
            findMany: async ({ where }: { where: { id: { $in: number[] } } }) =>
              where.id.$in.filter((id) => roles.includes(id)).map((id) => ({ id })),
          };
        }

        return membershipQuery;
      },
    },
  } as never;

  return { strapi, table, reads, emitted, service: createMembershipService({ strapi }) };
};

const membershipOf = (id: number, space = FRANCE, roles: Array<{ id: number }> = []) => ({
  id,
  user: 7,
  space,
  roles,
});

describe('who belongs to a space', () => {
  describe('reading a user’s memberships', () => {
    it('lists the spaces they belong to', async () => {
      const { service } = makeStrapi({ rows: [membershipOf(1)] });

      await expect(service.listForUser(7)).resolves.toHaveLength(1);
    });

    it('drops a membership of an archived space', async () => {
      // The space was turned off; a stored membership must not keep it open.
      const { service } = makeStrapi({ rows: [membershipOf(1, ARCHIVED)] });

      await expect(service.listForUser(7)).resolves.toEqual([]);
    });

    it('is answered from cache on the next request', async () => {
      // It is read on the authentication path of every admin request.
      const { service, reads } = makeStrapi({ rows: [membershipOf(1)] });

      await service.listForUser(7);
      await service.listForUser(7);

      expect(reads.memberships).toBe(1);
    });

    it('is read again after the memberships change', async () => {
      const { service, reads } = makeStrapi({ rows: [membershipOf(1)] });

      await service.listForUser(7);
      await service.remove(7, 1);
      await service.listForUser(7);

      expect(reads.memberships).toBe(2);
    });

    it('is read again for everyone after a space is emptied', async () => {
      // Deleting a space revokes every membership of it at once, and the cache
      // is per user, so there is no one user to forget.
      const { service, reads } = makeStrapi({ rows: [membershipOf(1)] });

      await service.listForUser(7);
      await service.removeAllForSpace(1);
      await service.listForUser(7);

      expect(reads.memberships).toBe(2);
    });
  });

  describe('adding someone', () => {
    it('records the membership', async () => {
      const { service, table } = makeStrapi();

      await service.upsert({ userId: 7, spaceId: 1 });

      expect(table).toHaveLength(1);
    });

    it('updates the roles of someone already in the space', async () => {
      const { service, table } = makeStrapi({ rows: [membershipOf(1, FRANCE, [{ id: 1 }])] });

      await service.upsert({ userId: 7, spaceId: 1, roleIds: [2] });

      expect(table).toHaveLength(1);
      expect(table[0].roles).toEqual([{ id: 2 }]);
    });

    it('refuses a space that does not exist', async () => {
      const { service } = makeStrapi();

      await expect(service.upsert({ userId: 7, spaceId: 99 })).rejects.toThrow(/does not exist/i);
    });

    it('refuses a user that does not exist', async () => {
      const { service } = makeStrapi();

      await expect(service.upsert({ userId: 99, spaceId: 1 })).rejects.toThrow(/does not exist/i);
    });

    it('refuses a role that does not exist', async () => {
      const { service } = makeStrapi();

      await expect(service.upsert({ userId: 7, spaceId: 1, roleIds: [1, 99] })).rejects.toThrow(
        /roles does not exist/i
      );
    });

    it('announces the change, so other processes can drop their caches', async () => {
      const { service, emitted } = makeStrapi();

      await service.upsert({ userId: 7, spaceId: 1 });

      expect(emitted.map(([event]) => event)).toEqual(['spaces.membership.update']);
    });
  });

  describe('the roles someone holds in a space', () => {
    it('are the ones their membership names', async () => {
      const { service } = makeStrapi({ rows: [membershipOf(1, FRANCE, [{ id: 4 }, { id: 5 }])] });

      await expect(service.getEffectiveRoleIds(7, 1)).resolves.toEqual([4, 5]);
    });

    it('are their platform-wide ones when the membership names none', async () => {
      // `null` means "do not narrow" — the setup that behaves like Strapi
      // without Spaces, and the common one.
      const { service } = makeStrapi({ rows: [membershipOf(1)] });

      await expect(service.getEffectiveRoleIds(7, 1)).resolves.toBeNull();
    });

    it('are none at all for someone who is not a member', async () => {
      const { service } = makeStrapi();

      await expect(service.getEffectiveRoleIds(7, 1)).resolves.toEqual([]);
    });

    it('are none for a space they only reached through an archived membership', async () => {
      const { service } = makeStrapi({ rows: [membershipOf(1, ARCHIVED)] });

      await expect(service.getEffectiveRoleIds(7, 2)).resolves.toEqual([]);
    });
  });

  describe('membership checks', () => {
    it('recognise a member', async () => {
      const { service } = makeStrapi({ rows: [membershipOf(1)] });

      await expect(service.isMember(7, 1)).resolves.toBe(true);
    });

    it('reject someone who belongs to a different space', async () => {
      const { service } = makeStrapi({ rows: [membershipOf(1)] });

      await expect(service.isMember(7, 2)).resolves.toBe(false);
    });
  });

  describe('removing someone', () => {
    it('takes them out of that space only', async () => {
      const { service, table } = makeStrapi({
        rows: [membershipOf(1), { ...membershipOf(2), space: { ...FRANCE, id: 3 } }],
      });

      await service.remove(7, 1);

      expect(table.map((row) => row.space.id)).toEqual([3]);
    });

    it('takes a deleted user out of every space', async () => {
      const { service, table } = makeStrapi({
        rows: [membershipOf(1), { ...membershipOf(2), space: { ...FRANCE, id: 3 } }],
      });

      await service.removeAllForUser(7);

      expect(table).toEqual([]);
    });
  });
});
