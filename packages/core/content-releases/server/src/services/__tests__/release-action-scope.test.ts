import createReleaseActionService from '../release-action';

const makeStrapi = () => {
  const findPage = jest.fn().mockResolvedValue({ results: [], pagination: {} });
  const count = jest.fn().mockResolvedValue(0);
  const strapi = {
    get: () => ({ transform: (_uid: string, query: any) => query }),
    db: {
      query: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue({ id: 1 }),
        findPage,
        count,
      })),
    },
    plugin: () => ({
      service: () => () => ({ populateDeep: () => ({ build: async () => ({}) }) }),
    }),
  } as any;
  return { strapi, findPage, count };
};

describe('release-action scope strategy', () => {
  afterEach(() => {
    createReleaseActionService({ strapi: makeStrapi().strapi }).setActionScopeStrategy(null);
  });

  it('keeps the caller filters when listing the actions of a release', async () => {
    const { strapi, findPage } = makeStrapi();
    const service = createReleaseActionService({ strapi });

    await service.findPage(1, { where: { type: 'publish' } } as any);

    expect(findPage).toHaveBeenCalledWith(
      expect.objectContaining({ where: { $and: [{ release: 1 }, { type: 'publish' }] } })
    );
  });

  it('ANDs the strategy where on listings and counts, and never on unscoped counts', async () => {
    const { strapi, findPage, count } = makeStrapi();
    const service = createReleaseActionService({ strapi });
    const scope = { space: { id: 2 } };
    service.setActionScopeStrategy({
      getActionWhere: async () => scope,
      getReleaseWhere: async () => null,
    });

    await service.findPage(1, {} as any);
    await service.countActions({ filters: { release: 1 } } as any);
    await service.countActions({ filters: { release: 1 } } as any, { unscoped: true });

    expect(findPage).toHaveBeenCalledWith(
      expect.objectContaining({ where: { $and: [{ release: 1 }, scope] } })
    );
    expect(count).toHaveBeenNthCalledWith(1, { filters: { release: 1 }, where: { $and: [scope] } });
    expect(count).toHaveBeenNthCalledWith(2, { filters: { release: 1 } });
  });

  it('is a no-op when the strategy answers null', async () => {
    const { strapi, count } = makeStrapi();
    const service = createReleaseActionService({ strapi });
    service.setActionScopeStrategy({
      getActionWhere: async () => null,
      getReleaseWhere: async () => null,
    });

    await service.countActions({ filters: { release: 1 } } as any);

    expect(count).toHaveBeenCalledWith({ filters: { release: 1 } });
  });
});
