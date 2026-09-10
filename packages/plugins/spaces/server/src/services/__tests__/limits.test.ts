import limitsService from '../limits';

const makeStrapi = ({
  licence,
  config,
  count = 0,
}: {
  licence?: unknown;
  config?: unknown;
  count?: number;
}) =>
  ({
    ee: { features: { get: () => licence } },
    plugin: () => ({ config: (key: string) => (key === 'maxSpaces' ? config : undefined) }),
    db: { query: () => ({ count: async () => count }) },
  }) as any;

describe('limits service', () => {
  it('prefers the licence option, then the plugin config, else unlimited', () => {
    expect(
      limitsService({
        strapi: makeStrapi({ licence: { options: { maxSpaces: 3 } }, config: 10 }),
      }).getMaxSpaces()
    ).toBe(3);
    expect(
      limitsService({ strapi: makeStrapi({ licence: true, config: 10 }) }).getMaxSpaces()
    ).toBe(10);
    expect(limitsService({ strapi: makeStrapi({ config: null }) }).getMaxSpaces()).toBeNull();
    expect(limitsService({ strapi: makeStrapi({ config: 0 }) }).getMaxSpaces()).toBeNull();
  });

  it('reports the usage against the cap', async () => {
    await expect(
      limitsService({ strapi: makeStrapi({ config: 2, count: 1 }) }).getUsage()
    ).resolves.toEqual({
      maxSpaces: 2,
      count: 1,
      canCreate: true,
    });
    await expect(
      limitsService({ strapi: makeStrapi({ config: 2, count: 2 }) }).getUsage()
    ).resolves.toEqual({
      maxSpaces: 2,
      count: 2,
      canCreate: false,
    });
    await expect(
      limitsService({ strapi: makeStrapi({ count: 50 }) }).getUsage()
    ).resolves.toMatchObject({
      maxSpaces: null,
      canCreate: true,
    });
  });

  it('refuses a creation at the cap with an explicit code', async () => {
    const service = limitsService({ strapi: makeStrapi({ config: 1, count: 1 }) });

    await expect(service.assertCanCreate()).rejects.toMatchObject({
      name: 'SpaceLimitError',
      message: 'Workspace limit reached (1).',
      details: { code: 'SPACES_LIMIT_REACHED', maxSpaces: 1, count: 1 },
    });
    await expect(
      limitsService({ strapi: makeStrapi({ config: 2, count: 1 }) }).assertCanCreate()
    ).resolves.toBeUndefined();
  });
});
