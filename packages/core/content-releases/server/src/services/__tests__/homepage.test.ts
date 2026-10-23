import type { Core } from '@strapi/types';

import createHomepageService from '../homepage';

const release = (id: number, scheduledAt: string | null) => ({ id, scheduledAt });

const setup = (unscheduled: unknown[], scheduled: unknown[]) => {
  const findMany = jest.fn(async ({ filters }) =>
    filters.scheduledAt.$notNull ? scheduled : unscheduled
  );
  const strapi = { db: { query: () => ({ findMany }) } } as unknown as Core.Strapi;

  return { service: createHomepageService({ strapi }), findMany };
};

describe('Homepage service', () => {
  it('lists unscheduled releases before scheduled ones, four at most', async () => {
    const { service, findMany } = setup(
      [1, 2, 3].map((id) => release(id, null)),
      [4, 5].map((id) => release(id, '2024-01-08T00:00:00.000Z'))
    );

    expect((await service.getUpcomingReleases()).map(({ id }) => id)).toEqual([1, 2, 3, 4]);
    // Each query is capped and ordered so the first row is stable across databases
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ scheduledAt: { $notNull: false } }),
        orderBy: [{ id: 'asc' }],
        limit: 4,
      })
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ scheduledAt: { $notNull: true } }),
        orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
        limit: 4,
      })
    );
  });
});
