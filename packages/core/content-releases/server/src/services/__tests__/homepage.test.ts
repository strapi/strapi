import createHomepageService from '../homepage';

type Row = { id: number; name: string; scheduledAt: string | null; releasedAt: string | null };

/**
 * Applies the filters the service may send, then lets `afterQuery` change a
 * row, the way a second admin would between two queries.
 */
const createStrapiMock = (rows: Row[], afterQuery: (rows: Row[]) => void) => {
  const findMany = jest.fn(async ({ filters }: { filters: Record<string, any> }) => {
    const result = rows
      .filter((row) => row.releasedAt === null)
      .filter((row) => {
        if (filters.scheduledAt?.$null) return row.scheduledAt === null;
        if (filters.scheduledAt?.$notNull) return row.scheduledAt !== null;
        return true;
      })
      .map((row) => ({ ...row }));

    afterQuery(rows);
    return result;
  });

  return { strapi: { db: { query: jest.fn(() => ({ findMany })) } }, findMany };
};

describe('homepage service', () => {
  test('lists unscheduled releases first, then the soonest schedule, ties by id', async () => {
    const { strapi } = createStrapiMock(
      [
        { id: 1, name: 'later', scheduledAt: '2024-02-01T00:00:00.000Z', releasedAt: null },
        { id: 2, name: 'unscheduled', scheduledAt: null, releasedAt: null },
        { id: 3, name: 'soon', scheduledAt: '2024-01-01T00:00:00.000Z', releasedAt: null },
        { id: 4, name: 'done', scheduledAt: null, releasedAt: '2024-01-01T00:00:00.000Z' },
        { id: 5, name: 'unscheduled too', scheduledAt: null, releasedAt: null },
        { id: 6, name: 'latest', scheduledAt: '2024-03-01T00:00:00.000Z', releasedAt: null },
      ],
      () => {}
    );

    const releases = await createHomepageService({ strapi } as any).getUpcomingReleases();

    expect(releases.map((release) => release.id)).toEqual([2, 5, 3, 1]);
  });

  test('lists a release once when another admin schedules it during the lookup', async () => {
    const { strapi } = createStrapiMock(
      [
        { id: 1, name: 'r1', scheduledAt: null, releasedAt: null },
        { id: 2, name: 'r2', scheduledAt: '2024-01-01T00:00:00.000Z', releasedAt: null },
        { id: 3, name: 'r3', scheduledAt: null, releasedAt: null },
      ],
      (rows) => {
        rows[0].scheduledAt = '2023-12-01T00:00:00.000Z';
      }
    );

    const releases = await createHomepageService({ strapi } as any).getUpcomingReleases();

    expect(releases.map((release) => release.id)).toEqual([1, 3, 2]);
  });

  test('keeps a release when another admin unschedules it during the lookup', async () => {
    const { strapi } = createStrapiMock(
      [
        { id: 1, name: 'r1', scheduledAt: null, releasedAt: null },
        { id: 2, name: 'r2', scheduledAt: '2024-01-01T00:00:00.000Z', releasedAt: null },
        { id: 3, name: 'r3', scheduledAt: '2024-02-01T00:00:00.000Z', releasedAt: null },
      ],
      (rows) => {
        rows[1].scheduledAt = null;
      }
    );

    const releases = await createHomepageService({ strapi } as any).getUpcomingReleases();

    expect(releases.map((release) => release.id)).toEqual([1, 2, 3]);
  });
});
