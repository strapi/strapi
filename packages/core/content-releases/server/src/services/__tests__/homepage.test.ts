import createHomepageService from '../homepage';

const createStrapi = (pages: Array<Array<{ id: number }>>) => {
  const calls: Array<{ filters: Record<string, unknown>; limit?: number }> = [];

  return {
    calls,
    strapi: {
      db: {
        query: () => ({
          findMany: jest.fn(async (params: { filters: Record<string, unknown> }) => {
            calls.push(params);
            return pages[calls.length - 1] ?? [];
          }),
        }),
      },
    },
  };
};

describe('homepage.getUpcomingReleases', () => {
  it('asks the scheduled query to skip releases already returned', async () => {
    const { calls, strapi } = createStrapi([[{ id: 1 }, { id: 3 }], [{ id: 2 }]]);
    const service = createHomepageService({ strapi } as any);

    await expect(service.getUpcomingReleases()).resolves.toEqual([{ id: 1 }, { id: 3 }, { id: 2 }]);
    expect(calls[1].filters.id).toEqual({ $notIn: [1, 3] });
  });

  it('does not add an empty id exclusion when nothing is unscheduled', async () => {
    const { calls, strapi } = createStrapi([[], [{ id: 4 }]]);
    const service = createHomepageService({ strapi } as any);

    await expect(service.getUpcomingReleases()).resolves.toEqual([{ id: 4 }]);
    expect(calls[1].filters.id).toBeUndefined();
  });

  it('returns four unscheduled releases without asking for scheduled ones', async () => {
    const { calls, strapi } = createStrapi([[{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]]);
    const service = createHomepageService({ strapi } as any);

    await expect(service.getUpcomingReleases()).resolves.toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
    ]);
    expect(calls).toHaveLength(1);
  });

  it('uses the remaining slots for scheduled releases and excludes the ones already listed', async () => {
    const { calls, strapi } = createStrapi([[{ id: 1 }, { id: 2 }, { id: 3 }], [{ id: 5 }]]);
    const service = createHomepageService({ strapi } as any);

    await expect(service.getUpcomingReleases()).resolves.toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 5 },
    ]);
    expect(calls[1]).toEqual(
      expect.objectContaining({
        limit: 1,
        filters: expect.objectContaining({ id: { $notIn: [1, 2, 3] } }),
      })
    );
  });
});
