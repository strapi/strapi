import type { Core } from '@strapi/types';

import createHomepageService from '../homepage';

const release = (id: number, scheduledAt: string | null) => ({ id, scheduledAt });

const setup = (unscheduled: unknown[], scheduled: unknown[]) => {
  const findMany = jest.fn(async ({ filters }) =>
    filters.scheduledAt.$notNull ? scheduled : unscheduled
  );
  const strapi = { db: { query: () => ({ findMany }) } } as unknown as Core.Strapi;

  return createHomepageService({ strapi });
};

describe('Homepage service', () => {
  it('lists unscheduled releases before scheduled ones, four at most', async () => {
    const service = setup(
      [1, 2, 3].map((id) => release(id, null)),
      [4, 5].map((id) => release(id, '2024-01-08T00:00:00.000Z'))
    );

    expect((await service.getUpcomingReleases()).map(({ id }) => id)).toEqual([1, 2, 3, 4]);
  });
});
