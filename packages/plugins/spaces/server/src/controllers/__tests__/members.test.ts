import type { Context } from 'koa';

import createMembersController from '../members';

const ALICE = {
  id: 7,
  firstname: 'Alice',
  lastname: 'Martin',
  email: 'alice@example.com',
  roles: [{ id: 1, name: 'Editor' }],
  password: '$2a$10$hashed',
  resetPasswordToken: 'secret-token',
  registrationToken: 'another-secret',
  isActive: true,
};

const BOB = { ...ALICE, id: 8, firstname: 'Bob', email: 'bob@example.com' };

interface Options {
  users?: Array<Record<string, unknown>>;
  memberships?: Array<Record<string, unknown>>;
  /** Set when the caller may not administer the space in question. */
  denied?: string;
}

const makeStrapi = ({ users = [ALICE, BOB], memberships = [], denied }: Options = {}) => {
  const calls: Array<[string, unknown]> = [];

  const strapi = {
    requestContext: { get: () => undefined },
    db: {
      query: () => ({ findMany: async () => users.filter((user) => user.isActive) }),
    },
    service: (uid: string) =>
      ({
        'plugin::spaces.access': {
          async assertCanActOn(_ctx: unknown, spaceId: number) {
            calls.push(['assertCanActOn', spaceId]);

            if (denied) {
              throw new Error(denied);
            }
          },
        },
        'plugin::spaces.membership': {
          listForSpace: async () => memberships,
          async upsert(input: unknown) {
            calls.push(['upsert', input]);

            return { id: 1, ...(input as object) };
          },
          async remove(userId: number, spaceId: number) {
            calls.push(['remove', { userId, spaceId }]);
          },
        },
      })[uid],
  } as never;

  return { strapi, calls, controller: createMembersController({ strapi }) };
};

type TestContext = Context & { body: any };

const makeCtx = (overrides: Record<string, unknown> = {}) =>
  ({
    state: { user: { id: 1 } },
    params: { spaceId: '3' },
    request: { body: {} },
    ...overrides,
  }) as unknown as TestContext;

describe('the space membership endpoints', () => {
  describe('every one of them', () => {
    it.each([
      ['find', (c: any) => c.find(makeCtx())],
      [
        'upsert',
        (c: any) => c.upsert(makeCtx({ params: { spaceId: '3' }, request: { body: { user: 7 } } })),
      ],
      ['remove', (c: any) => c.remove(makeCtx({ params: { spaceId: '3', userId: '7' } }))],
      ['candidates', (c: any) => c.candidates(makeCtx())],
    ])('checks the caller may administer the space first (%s)', async (_name, call) => {
      // Holding the permission is not enough: it must be held for this space.
      const { controller, calls } = makeStrapi();

      await call(controller);

      expect(calls[0]).toEqual(['assertCanActOn', 3]);
    });

    it.each([
      ['find', (c: any) => c.find(makeCtx())],
      ['upsert', (c: any) => c.upsert(makeCtx({ request: { body: { user: 7 } } }))],
      ['remove', (c: any) => c.remove(makeCtx({ params: { spaceId: '3', userId: '7' } }))],
      ['candidates', (c: any) => c.candidates(makeCtx())],
    ])('stops there when they may not (%s)', async (_name, call) => {
      const { controller, calls } = makeStrapi({ denied: 'Not for you.' });

      await expect(call(controller)).rejects.toThrow('Not for you.');
      expect(calls).toHaveLength(1);
    });
  });

  describe('listing the members', () => {
    it('says who they are and what they hold in this space', async () => {
      const { controller } = makeStrapi({
        memberships: [{ id: 1, user: ALICE, roles: [{ id: 2, name: 'Author' }] }],
      });
      const ctx = makeCtx();

      await controller.find(ctx);

      expect(ctx.body.data).toEqual([
        {
          id: 1,
          user: {
            id: 7,
            firstname: 'Alice',
            lastname: 'Martin',
            email: 'alice@example.com',
            roles: [{ id: 1, name: 'Editor' }],
          },
          roles: [{ id: 2, name: 'Author' }],
        },
      ]);
    });

    it('does not turn administering a space into reading user records', async () => {
      // Whatever else the user row carries stays on the server.
      const { controller } = makeStrapi({ memberships: [{ id: 1, user: ALICE, roles: [] }] });
      const ctx = makeCtx();

      await controller.find(ctx);

      const [member] = ctx.body.data;
      expect(Object.keys(member.user).sort()).toEqual([
        'email',
        'firstname',
        'id',
        'lastname',
        'roles',
      ]);
    });

    it('copes with a membership whose user is gone', async () => {
      const { controller } = makeStrapi({ memberships: [{ id: 1, user: undefined, roles: [] }] });
      const ctx = makeCtx();

      await controller.find(ctx);

      expect(ctx.body.data[0].user).toBeNull();
    });
  });

  describe('adding a member', () => {
    it('needs a user id', async () => {
      const { controller } = makeStrapi();

      await expect(controller.upsert(makeCtx({ request: { body: {} } }))).rejects.toThrow(
        '"user" must be a user id.'
      );
    });

    it('refuses roles that are not a list', async () => {
      const { controller } = makeStrapi();

      await expect(
        controller.upsert(makeCtx({ request: { body: { user: 7, roles: 'admin' } } }))
      ).rejects.toThrow(/"roles" must be an array/);
    });

    it('refuses a role that is not an id', async () => {
      const { controller } = makeStrapi();

      await expect(
        controller.upsert(makeCtx({ request: { body: { user: 7, roles: ['admin'] } } }))
      ).rejects.toThrow(/"roles" must contain role ids/);
    });

    it('records the roles it was given', async () => {
      const { controller, calls } = makeStrapi();

      await controller.upsert(makeCtx({ request: { body: { user: 7, roles: [1, '2'] } } }));

      expect(calls[1]).toEqual(['upsert', { spaceId: 3, userId: 7, roleIds: [1, 2] }]);
    });

    it('leaves the roles alone when none were named', async () => {
      // No roles means "keep the platform-wide ones", which is different from
      // "hold no roles here".
      const { controller, calls } = makeStrapi();

      await controller.upsert(makeCtx({ request: { body: { user: 7 } } }));

      expect(calls[1]).toEqual(['upsert', { spaceId: 3, userId: 7, roleIds: undefined }]);
    });
  });

  describe('removing a member', () => {
    it('removes them from this space only', async () => {
      const { controller, calls } = makeStrapi();

      await controller.remove(makeCtx({ params: { spaceId: '3', userId: '7' } }));

      expect(calls[1]).toEqual(['remove', { userId: 7, spaceId: 3 }]);
    });
  });

  describe('who could be added', () => {
    it('leaves out the people already in the space', async () => {
      const { controller } = makeStrapi({ memberships: [{ id: 1, user: ALICE, roles: [] }] });
      const ctx = makeCtx();

      await controller.candidates(ctx);

      expect(ctx.body.data.map((user: { id: number }) => user.id)).toEqual([8]);
    });

    it('leaves out deactivated administrators', async () => {
      const { controller } = makeStrapi({ users: [ALICE, { ...BOB, isActive: false }] });
      const ctx = makeCtx();

      await controller.candidates(ctx);

      expect(ctx.body.data.map((user: { id: number }) => user.id)).toEqual([7]);
    });

    it('says only what is needed to pick someone', async () => {
      const { controller } = makeStrapi({ users: [ALICE] });
      const ctx = makeCtx();

      await controller.candidates(ctx);

      expect(Object.keys(ctx.body.data[0]).sort()).toEqual([
        'email',
        'firstname',
        'id',
        'lastname',
        'roles',
      ]);
    });
  });
});
