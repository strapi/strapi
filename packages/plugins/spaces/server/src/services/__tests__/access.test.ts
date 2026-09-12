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

const makeCtx = (header?: string, user?: { id: number }, path = '/admin/content-manager/x') =>
  ({
    path,
    state: user ? { user } : {},
    get: (name: string) => (name.toLowerCase() === 'x-strapi-space' ? (header ?? '') : ''),
  }) as any;

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

      const { scope } = await service.resolve(makeCtx('fr', { id: 1 }));

      expect(scope).toEqual({ mode: 'space', id: 2, slug: 'de' });
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

    it('does not overwrite a space something upstream already settled', async () => {
      const strapi = makeStrapi({ memberships: [{ space: FRANCE }] });
      const service = createAccessService({ strapi });
      const ctx = makeCtx(undefined, { id: 10 });
      ctx.state[SPACE_STATE_KEY] = { mode: 'space', id: 99, slug: 'preset' };

      await service.applyToRequest(ctx);

      expect(ctx.state[SPACE_STATE_KEY]).toEqual({ mode: 'space', id: 99, slug: 'preset' });
    });
  });
});
