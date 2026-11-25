import type { Core } from '@strapi/types';

import createHomepageService from '../homepage';

const release = (id: number, scheduledAt: string | null) => ({ id, scheduledAt });

const setup = (unscheduled: unknown[], scheduled: unknown[]) => {
  const findMany = jest.fn(async ({ filters, limit }) =>
    (filters.scheduledAt.$notNull ? scheduled : unscheduled).slice(0, limit)
  );
  const strapi = { db: { query: () => ({ findMany }) } } as unknown as Core.Strapi;

  return { service: createHomepageService({ strapi }), findMany };
};

const date = '2024-01-08T00:00:00.000Z';

describe('Homepage service', () => {
  it('lists scheduled releases first even when four undated releases exist', async () => {
    const { service } = setup(
      [1, 2, 3, 4].map((id) => release(id, null)),
      [release(5, date)]
    );

    expect((await service.getUpcomingReleases()).map(({ id }) => id)).toEqual([5, 1, 2, 3]);
  });

  it('fills the remaining slots with undated releases after scheduled ones', async () => {
    const { service } = setup(
      [1, 2].map((id) => release(id, null)),
      [release(3, date)]
    );

    expect((await service.getUpcomingReleases()).map(({ id }) => id)).toEqual([3, 1, 2]);
  });

  it('caps the list at four scheduled releases', async () => {
    const { service } = setup(
      [1].map((id) => release(id, null)),
      [2, 3, 4, 5, 6].map((id) => release(id, date))
    );

    expect((await service.getUpcomingReleases()).map(({ id }) => id)).toEqual([2, 3, 4, 5]);
  });
});
