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
  it('lists unscheduled pending releases first, then the scheduled ones by date', async () => {
    const { service, findMany } = setup(
      [release(3, null)],
      [release(1, '2024-01-08T00:00:00.000Z'), release(2, '2024-01-09T00:00:00.000Z')]
    );

    expect(await service.getUpcomingReleases()).toEqual([
      release(3, null),
      release(1, '2024-01-08T00:00:00.000Z'),
      release(2, '2024-01-09T00:00:00.000Z'),
    ]);
    expect(findMany).toHaveBeenCalledWith({
      filters: { releasedAt: { $notNull: false }, scheduledAt: { $notNull: true } },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
      limit: 4,
    });
  });

  it('returns at most four releases', async () => {
    const { service } = setup(
      [1, 2, 3].map((id) => release(id, null)),
      [4, 5].map((id) => release(id, '2024-01-08T00:00:00.000Z'))
    );

    expect((await service.getUpcomingReleases()).map(({ id }) => id)).toEqual([1, 2, 3, 4]);
  });
});
