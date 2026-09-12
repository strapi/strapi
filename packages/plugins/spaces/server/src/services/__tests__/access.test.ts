import { SPACE_STATE_KEY } from '../../../../shared/constants';
import createAccessService from '../access';

jest.mock('../../integrations/api-tokens', () => ({
  resolveTokenSpace: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require
const { resolveTokenSpace } = require('../../integrations/api-tokens');

const FRANCE = { id: 1, slug: 'fr', name: 'France', status: 'active', isDefault: true };
const GERMANY = { id: 2, slug: 'de', name: 'Germany', status: 'active', isDefault: false };
const ARCHIVED = { id: 3, slug: 'old', name: 'Old', status: 'archived', isDefault: false };

const SPACES = [FRANCE, GERMANY, ARCHIVED];

interface Options {
  memberships?: Array<{ space: typeof FRANCE }>;
  accessAllPermission?: boolean;
  isSuperAdmin?: boolean;
}

const makeStrapi = ({
  memberships = [],
  accessAllPermission = false,
  isSuperAdmin = false,
}: Options = {}) => {
  const services: Record<string, any> = {
    'plugin::spaces.spaces': {
      list: async () => SPACES,
      findById: async (id: number) => SPACES.find((space) => space.id === id),
      findBySlug: async (slug: string) => SPACES.find((space) => space.slug === slug),
      async resolveHeaderValue(raw: string) {
        const space = SPACES.find((entry) => entry.slug === raw);

        return space?.status === 'active' ? space : undefined;
      },
      getDefault: async () => FRANCE,
    },
    'plugin::spaces.membership': {
      listForUser: async () => memberships,
      isMember: async (_userId: number, spaceId: number) =>
        memberships.some((membership) => membership.space.id === spaceId),
    },
    'admin::role': { hasSuperAdminRole: () => isSuperAdmin },
  };

  return {
    service: (uid: string) => services[uid],
    db: {
      query: () => ({
        findMany: async () => (accessAllPermission ? [{ id: 1 }] : []),
      }),
    },
  } as any;
};

/**
 * A request. `user` is an administrator unless `strategy` says otherwise —
 * Users & Permissions puts an application user on `ctx.state.user` too, and the
 * two must not be confused.
 */
const makeCtx = (
  header?: string,
  user?: { id: number },
  path = '/admin/content-manager/x',
  strategy?: string
) => {
  // A token request has an auth strategy but no user; an admin request has
  // both; an anonymous one has neither.
  const name = strategy ?? (user ? 'admin' : undefined);

  return {
    path,
    state: {
      ...(user ? { user } : {}),
      ...(name ? { auth: { strategy: { name } } } : {}),
    },
    get: (header_: string) => (header_.toLowerCase() === 'x-strapi-space' ? (header ?? '') : ''),
  } as any;
};

describe('space access', () => {
  beforeEach(() => {
    resolveTokenSpace.mockResolvedValue(undefined);
  });

  describe('a member of one space', () => {
    const strapi = () => makeStrapi({ memberships: [{ space: FRANCE }] });

    it('lands in it without asking', async () => {
      const service = createAccessService({ strapi: strapi() });

      const { scope } = await service.resolve(makeCtx(undefined, { id: 10 }));

      expect(scope).toEqual({ mode: 'space', id: 1, slug: 'fr' });
    });

    it('may name it explicitly', async () => {
      const service = createAccessService({ strapi: strapi() });

      const { scope } = await service.resolve(makeCtx('fr', { id: 10 }));

      expect(scope).toEqual({ mode: 'space', id: 1, slug: 'fr' });
    });

    it('is refused a space they do not belong to', async () => {
      const service = createAccessService({ strapi: strapi() });

      const { denied } = await service.resolve(makeCtx('de', { id: 10 }));

      expect(denied).toMatch(/not a member/i);
    });

    it('is refused the cross-space view', async () => {
      const service = createAccessService({ strapi: strapi() });

      const { scope, denied } = await service.resolve(makeCtx('*', { id: 10 }));

      expect(denied).toMatch(/every space/i);
      expect(scope.mode).toBe('unresolved');
    });
  });

  describe('a member of several spaces', () => {
    it('lands in the default one rather than whichever came back first', async () => {
      const strapi = makeStrapi({ memberships: [{ space: GERMANY }, { space: FRANCE }] });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(makeCtx(undefined, { id: 10 }));

      expect(scope).toEqual({ mode: 'space', id: 1, slug: 'fr' });
    });

    it('lands somewhere stable when none of them is the default', async () => {
      const strapi = makeStrapi({ memberships: [{ space: GERMANY }] });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(makeCtx(undefined, { id: 10 }));

      expect(scope).toEqual({ mode: 'space', id: 2, slug: 'de' });
    });
  });

  describe('a user who belongs to no space', () => {
    it('is not refused outright, so the admin still loads', async () => {
      const service = createAccessService({ strapi: makeStrapi() });

      const { scope, denied } = await service.resolve(makeCtx(undefined, { id: 10 }));

      expect(denied).toBeUndefined();
      expect(scope).toMatchObject({ mode: 'unresolved' });
    });

    it('is told why, so the admin can say so', async () => {
      const service = createAccessService({ strapi: makeStrapi() });

      const { scope } = await service.resolve(makeCtx(undefined, { id: 10 }));

      expect((scope as { reason?: string }).reason).toMatch(/do not belong to any space/i);
    });
  });

  describe('a user who may work across every space', () => {
    it('gets the cross-space view when they ask for it', async () => {
      const strapi = makeStrapi({ accessAllPermission: true });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(makeCtx('*', { id: 1 }));

      expect(scope).toEqual({ mode: 'global' });
    });

    it('may enter a space they are not a member of', async () => {
      const strapi = makeStrapi({ accessAllPermission: true });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(makeCtx('de', { id: 1 }));

      expect(scope).toEqual({ mode: 'space', id: 2, slug: 'de' });
    });

    it('lands in the default space rather than the cross-space view by default', async () => {
      const strapi = makeStrapi({ accessAllPermission: true });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(makeCtx(undefined, { id: 1 }));

      // Selecting a tenant must be deliberate: falling into "every space" would
      // make the riskiest view the one nobody chose.
      expect(scope).toEqual({ mode: 'space', id: 1, slug: 'fr' });
    });

    it('is granted to a super admin without a separate permission row', async () => {
      const strapi = makeStrapi({ isSuperAdmin: true });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(makeCtx('*', { id: 1 }));

      expect(scope).toEqual({ mode: 'global' });
    });
  });

  describe('archived and unknown spaces', () => {
    it('refuses an archived space rather than serving another one', async () => {
      const strapi = makeStrapi({ accessAllPermission: true });
      const service = createAccessService({ strapi });

      const { denied } = await service.resolve(makeCtx('old', { id: 1 }));

      expect(denied).toMatch(/unknown or archived/i);
    });

    it('refuses a space that does not exist', async () => {
      const strapi = makeStrapi({ accessAllPermission: true });
      const service = createAccessService({ strapi });

      const { denied } = await service.resolve(makeCtx('nope', { id: 1 }));

      expect(denied).toMatch(/unknown or archived/i);
    });
  });

  describe('callers with no admin user', () => {
    it('gets the space the request names', async () => {
      const service = createAccessService({ strapi: makeStrapi() });

      const { scope } = await service.resolve(makeCtx('de'));

      expect(scope).toEqual({ mode: 'space', id: 2, slug: 'de' });
    });

    it('falls back to the default space', async () => {
      const service = createAccessService({ strapi: makeStrapi() });

      const { scope } = await service.resolve(makeCtx());

      expect(scope).toEqual({ mode: 'space', id: 1, slug: 'fr' });
    });

    it('never gets the cross-space view by asking for it', async () => {
      const service = createAccessService({ strapi: makeStrapi() });

      const { scope } = await service.resolve(makeCtx('*'));

      expect(scope).not.toEqual({ mode: 'global' });
    });
  });

  describe('a token', () => {
    it('acts in the space it was issued in, whatever the request asks for', async () => {
      resolveTokenSpace.mockResolvedValue({ id: 2, slug: 'de' });

      const strapi = makeStrapi({ accessAllPermission: true });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(makeCtx('fr', { id: 1 }, undefined, 'api-token'));

      expect(scope).toEqual({ mode: 'space', id: 2, slug: 'de' });
    });

    it('lands in the default space when it is bound to none', async () => {
      // A token issued before Spaces has no space of its own. Letting its
      // header choose would make every pre-existing token a cross-tenant one.
      resolveTokenSpace.mockResolvedValue(undefined);

      const service = createAccessService({ strapi: makeStrapi() });

      const { scope } = await service.resolve(makeCtx('de', undefined, undefined, 'api-token'));

      expect(scope).toEqual({ mode: 'space', id: 1, slug: 'fr' });
    });
  });

  describe('an application user is not an administrator', () => {
    it('does not inherit the memberships of the admin with the same id', async () => {
      // Users & Permissions puts its own user on ctx.state.user, from a
      // different table with its own ids.
      const strapi = makeStrapi({ memberships: [{ space: GERMANY }] });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(
        makeCtx(undefined, { id: 10 }, '/api/articles', 'users-permissions')
      );

      expect(scope).toEqual({ mode: 'space', id: 1, slug: 'fr' });
    });

    it('does not inherit cross-space access either', async () => {
      const strapi = makeStrapi({ accessAllPermission: true });
      const service = createAccessService({ strapi });

      const { scope } = await service.resolve(
        makeCtx('*', { id: 1 }, '/api/articles', 'users-permissions')
      );

      expect(scope).not.toEqual({ mode: 'global' });
    });
  });

  describe('acting on a particular space', () => {
    it('lets a member administer their own space', async () => {
      const strapi = makeStrapi({ memberships: [{ space: FRANCE }] });
      const service = createAccessService({ strapi });

      await expect(
        service.assertCanActOn(makeCtx(undefined, { id: 10 }), FRANCE.id)
      ).resolves.toBeUndefined();
    });

    it('refuses a space they do not belong to', async () => {
      // Holding the permission says someone administers memberships, not which
      // spaces are theirs to administer.
      const strapi = makeStrapi({ memberships: [{ space: FRANCE }] });
      const service = createAccessService({ strapi });

      await expect(
        service.assertCanActOn(makeCtx(undefined, { id: 10 }), GERMANY.id)
      ).rejects.toThrow(/not a member/i);
    });

    it('lets someone with cross-space access administer any space', async () => {
      const strapi = makeStrapi({ accessAllPermission: true });
      const service = createAccessService({ strapi });

      await expect(
        service.assertCanActOn(makeCtx(undefined, { id: 1 }), GERMANY.id)
      ).resolves.toBeUndefined();
    });
  });

  describe('applying the result to a request', () => {
    it('records the settled space', async () => {
      const strapi = makeStrapi({ memberships: [{ space: FRANCE }] });
      const service = createAccessService({ strapi });
      const ctx = makeCtx(undefined, { id: 10 });

      await service.applyToRequest(ctx);

      expect(ctx.state[SPACE_STATE_KEY]).toEqual({ mode: 'space', id: 1, slug: 'fr' });
    });

    it('throws on a deliberate request for a space the caller may not enter', async () => {
      const strapi = makeStrapi({ memberships: [{ space: FRANCE }] });
      const service = createAccessService({ strapi });

      await expect(service.applyToRequest(makeCtx('de', { id: 10 }))).rejects.toThrow(
        /not a member/i
      );
    });

    it('leaves sign-in and bootstrap routes without a space', async () => {
      const strapi = makeStrapi();
      const service = createAccessService({ strapi });
      const ctx = makeCtx(undefined, undefined, '/admin/login');

      await service.applyToRequest(ctx);

      expect(ctx.state[SPACE_STATE_KEY]).toMatchObject({ mode: 'unresolved' });
    });

    it('settles once for a caller and does not redo the work', async () => {
      const strapi = makeStrapi({ memberships: [{ space: FRANCE }] });
      const listForUser = jest.spyOn(strapi.service('plugin::spaces.membership'), 'listForUser');
      const service = createAccessService({ strapi });
      const ctx = makeCtx(undefined, { id: 10 });

      await service.applyToRequest(ctx);
      await service.applyToRequest(ctx);

      expect(listForUser).toHaveBeenCalledTimes(1);
    });

    it('settles again when the caller turns out to be someone else', async () => {
      // A route that authenticates itself — the MCP endpoint does — runs the
      // handlers once as an anonymous caller and again once it knows who is
      // asking. The second answer has to replace the first.
      const strapi = makeStrapi({ memberships: [{ space: GERMANY }] });
      const service = createAccessService({ strapi });
      const ctx = makeCtx(undefined);

      await service.applyToRequest(ctx);
      expect(ctx.state[SPACE_STATE_KEY]).toEqual({ mode: 'space', id: 1, slug: 'fr' });

      ctx.state.user = { id: 10 };
      ctx.state.auth = { strategy: { name: 'admin' } };
      await service.applyToRequest(ctx);

      expect(ctx.state[SPACE_STATE_KEY]).toEqual({ mode: 'space', id: 2, slug: 'de' });
    });
  });
});
