import {
  bucketStatus,
  computeVisibleReleaseIds,
  lookupEntrySpaceId,
  patchReleasesForSpaces,
  visibleActionsWhere,
} from '../releases-integration';

describe('releases integration', () => {
  it('lets a workspace see empty releases and releases with a visible action', () => {
    expect(
      computeVisibleReleaseIds({
        allReleaseIds: [1, 2, 3, 4],
        releaseIdsWithActions: [2, 3, 4],
        releaseIdsWithVisibleActions: [3],
      })
    ).toEqual([1, 3]);
  });

  it('derives a bucket status', () => {
    expect(bucketStatus({ total: 0, invalid: 0 }, false)).toBe('empty');
    expect(bucketStatus({ total: 2, invalid: 0 }, false)).toBe('ready');
    expect(bucketStatus({ total: 2, invalid: 1 }, false)).toBe('blocked');
    expect(bucketStatus({ total: 2, invalid: 1 }, true)).toBe('done');
  });

  it('looks the entry workspace up across workspaces, shared and unscoped as null', async () => {
    const findMany = jest.fn(async ({ where }: any) =>
      where.documentId === 'own'
        ? [{ id: 1, space: { id: 2 }, spaceOverride: false }]
        : [{ id: 2, space: null, spaceOverride: false }]
    );
    const strapi = {
      contentTypes: {
        'api::article.article': { uid: 'api::article.article' },
        'plugin::x.y': { uid: 'plugin::x.y' },
      },
      db: { query: jest.fn(() => ({ findMany })) },
    } as any;

    expect(await lookupEntrySpaceId(strapi, 'api::article.article', 'own', 'en')).toBe(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { documentId: 'own', locale: 'en' } })
    );
    expect(await lookupEntrySpaceId(strapi, 'api::article.article', 'shared', null)).toBeNull();
    expect(await lookupEntrySpaceId(strapi, 'plugin::x.y', 'abc', null)).toBeNull();
    expect(await lookupEntrySpaceId(strapi, 'api::article.article', undefined, null)).toBeNull();
  });

  describe('scope strategy', () => {
    const install = (space?: { id: number; slug: string }) => {
      let strategy: any;
      const subscribe = jest.fn();
      const strapi = {
        requestContext: {
          get: () => (space ? { state: { spaceId: space.id, spaceSlug: space.slug } } : undefined),
        },
        plugin: (name: string) =>
          name === 'content-releases'
            ? {
                service: () => ({
                  setActionScopeStrategy: (next: unknown) => {
                    strategy = next;
                  },
                }),
              }
            : undefined,
        db: {
          lifecycles: { subscribe },
          query: jest.fn((uid: string) => ({
            findMany: async () =>
              uid === 'plugin::content-releases.release'
                ? [{ id: 1 }, { id: 2 }, { id: 3 }]
                : [
                    { id: 10, release: { id: 2 }, space: { id: 2 } },
                    { id: 11, release: { id: 3 }, space: { id: 3 } },
                  ],
          })),
        },
        contentTypes: {},
      } as any;
      patchReleasesForSpaces(strapi);
      return { strategy, subscribe };
    };

    it('is unscoped without a request or from default', async () => {
      const headerless = install();
      const asDefault = install({ id: 1, slug: 'default' });

      expect(await headerless.strategy.getActionWhere()).toBeNull();
      expect(await headerless.strategy.getReleaseWhere()).toBeNull();
      expect(await asDefault.strategy.getActionWhere()).toBeNull();
      expect(await asDefault.strategy.getReleaseWhere()).toBeNull();
    });

    it('narrows a sub-workspace to its entries and its releases', async () => {
      const { strategy, subscribe } = install({ id: 2, slug: 'acme' });

      expect(await strategy.getActionWhere()).toEqual(visibleActionsWhere(2));
      expect(await strategy.getReleaseWhere()).toEqual({ id: { $in: [1, 2] } });
      expect(subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ models: ['plugin::content-releases.release-action'] })
      );
    });

    it('does nothing without the releases plugin', () => {
      const strapi = { plugin: () => undefined } as any;
      expect(() => patchReleasesForSpaces(strapi)).not.toThrow();
    });
  });
});
