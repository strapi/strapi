import membershipService, { computeMemberSlugs } from '../membership';

const ALL = ['default', 'acme', 'globex'];

describe('computeMemberSlugs', () => {
  it('gives super admins every active workspace', () => {
    expect(
      computeMemberSlugs({
        isSuperAdmin: true,
        directSlugs: [],
        roleBindings: [['acme']],
        allActiveSlugs: ALL,
      })
    ).toEqual(new Set(ALL));
  });

  it('treats a platform-wide role (empty binding) as membership everywhere', () => {
    expect(
      computeMemberSlugs({
        isSuperAdmin: false,
        directSlugs: [],
        roleBindings: [['acme'], []],
        allActiveSlugs: ALL,
      })
    ).toEqual(new Set(ALL));
  });

  it('unions direct bindings and bound roles, ignoring archived workspaces', () => {
    expect(
      computeMemberSlugs({
        isSuperAdmin: false,
        directSlugs: ['globex', 'archived'],
        roleBindings: [['acme'], ['acme', 'archived']],
        allActiveSlugs: ALL,
      })
    ).toEqual(new Set(['globex', 'acme']));
  });

  it('is empty for a user with no binding and no role', () => {
    expect(
      computeMemberSlugs({
        isSuperAdmin: false,
        directSlugs: [],
        roleBindings: [],
        allActiveSlugs: ALL,
      })
    ).toEqual(new Set());
  });
});

describe('membership service', () => {
  const SPACES = [
    { id: 1, slug: 'default', name: 'Default', color: null, status: 'active' },
    { id: 2, slug: 'acme', name: 'Acme', color: null, status: 'active' },
  ];
  const USERS = [
    { id: 1, spaces: [], roles: [{ id: 1, code: 'strapi-super-admin', spaces: [] }] },
    { id: 2, spaces: [], roles: [{ id: 2, code: 'editor', spaces: [{ slug: 'acme' }] }] },
    {
      id: 3,
      spaces: [{ id: 2, slug: 'acme' }],
      roles: [{ id: 3, code: 'default-only', spaces: [{ slug: 'default' }] }],
    },
    { id: 4, spaces: [], roles: [{ id: 3, code: 'default-only', spaces: [{ slug: 'default' }] }] },
  ];

  const makeStrapi = () => {
    const update = jest.fn(async () => ({}));
    const storeData = new Map<string, unknown>();
    const strapi = {
      plugins: { spaces: { services: { spaces: { getAll: async () => SPACES } } } },
      store: () => ({
        get: async ({ key }: { key: string }) => storeData.get(key) ?? null,
        set: async ({ key, value }: { key: string; value: unknown }) => {
          storeData.set(key, value);
        },
        delete: async ({ key }: { key: string }) => {
          storeData.delete(key);
        },
      }),
      db: {
        query: jest.fn((uid: string) => ({
          findOne: async ({ where }: any) =>
            uid === 'plugin::spaces.space'
              ? (SPACES.find((space) => space.slug === where.slug) ?? null)
              : (USERS.find((user) => user.id === where.id) ?? null),
          findMany: async () => USERS,
          update,
        })),
      },
    } as any;
    (global as any).strapi = strapi;
    return { strapi, update, storeData };
  };

  it('lists the workspaces of a user in the switcher order', async () => {
    const { strapi } = makeStrapi();
    const service = membershipService({ strapi });

    expect((await service.spacesForUser(1)).map((s) => s.slug)).toEqual(['default', 'acme']);
    expect((await service.spacesForUser(2)).map((s) => s.slug)).toEqual(['acme']);
    expect((await service.spacesForUser(3)).map((s) => s.slug)).toEqual(['default', 'acme']);
    expect((await service.spacesForUser(4)).map((s) => s.slug)).toEqual(['default']);
    expect(await service.spacesForUser(99)).toEqual([]);
  });

  it('finds the members of a workspace', async () => {
    const { strapi } = makeStrapi();
    const service = membershipService({ strapi });

    expect(await service.memberUserIds('acme')).toEqual([1, 2, 3]);
    expect(await service.memberUserIds('default')).toEqual([1, 3, 4]);
  });

  /**
   * The default workspace is checked like any other. It is the widest view —
   * it sees every workspace's content — so exempting it would let an admin
   * restricted to one workspace read all of them just by asking for default.
   */
  it('answers membership questions, default included, with a cache', async () => {
    const { strapi } = makeStrapi();
    const service = membershipService({ strapi });

    expect(await service.isMember(4, 'default')).toBe(true);
    expect(await service.isMember(4, 'acme')).toBe(false);
    expect(await service.isMember(2, 'acme')).toBe(true);
    // Bound to acme only: default is refused, not waved through.
    expect(await service.isMember(2, 'default')).toBe(false);

    const calls = strapi.db.query.mock.calls.length;
    await service.isMember(2, 'acme');
    expect(strapi.db.query.mock.calls.length).toBe(calls);
  });

  it('binds a user to a workspace once', async () => {
    const { strapi, update } = makeStrapi();
    const service = membershipService({ strapi });

    await service.bindUser(4, 'acme');
    expect(update).toHaveBeenCalledWith({ where: { id: 4 }, data: { spaces: [2] } });

    await service.bindUser(3, 'acme');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('remembers the last workspace per user', async () => {
    const { strapi } = makeStrapi();
    const service = membershipService({ strapi });

    expect(await service.getLastSlug(2)).toBeNull();
    await service.setLastSlug(2, 'acme');
    expect(await service.getLastSlug(2)).toBe('acme');
    await service.forgetUser(2);
    expect(await service.getLastSlug(2)).toBeNull();
  });
});
