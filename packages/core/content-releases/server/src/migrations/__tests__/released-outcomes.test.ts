import type { Core } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { addOutcomesToReleasedReleases } from '..';

const releaseFindMany = jest.fn();
const releaseUpdate = jest.fn();
const actionUpdateMany = jest.fn();
const actionCount = jest.fn();
const logError = jest.fn();

const strapi = {
  db: {
    query: jest.fn((uid: string) =>
      uid === RELEASE_ACTION_MODEL_UID
        ? { updateMany: actionUpdateMany, count: actionCount }
        : { findMany: releaseFindMany, update: releaseUpdate }
    ),
    transaction: jest.fn((work: () => unknown) => work()),
  },
  log: { error: logError },
} as unknown as Core.Strapi;

describe('addOutcomesToReleasedReleases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actionCount.mockImplementation(async ({ where }) => (where.outcome === 'published' ? 2 : 1));
  });

  it('looks only for releases that ran as done before the totals existed', async () => {
    releaseFindMany.mockResolvedValue([]);

    await addOutcomesToReleasedReleases({ strapi });

    expect(releaseFindMany).toHaveBeenCalledWith({
      where: {
        releasedAt: { $notNull: true },
        totalSkippedEntries: null,
        $or: [{ status: 'done' }, { status: null }],
      },
      select: ['id'],
    });
  });

  it("records every entry as released and the release's totals", async () => {
    releaseFindMany.mockResolvedValue([{ id: 10 }]);

    await addOutcomesToReleasedReleases({ strapi });

    expect(actionUpdateMany.mock.calls).toStrictEqual([
      [{ where: { release: 10, type: 'publish', outcome: null }, data: { outcome: 'published' } }],
      [
        {
          where: { release: 10, type: 'unpublish', outcome: null },
          data: { outcome: 'unpublished' },
        },
      ],
    ]);
    expect(releaseUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { totalPublishedEntries: 2, totalUnpublishedEntries: 1, totalSkippedEntries: 0 },
    });
  });

  it('logs a release that fails and still migrates the others', async () => {
    releaseFindMany.mockResolvedValue([{ id: 10 }, { id: 20 }]);
    actionUpdateMany.mockRejectedValueOnce(new Error('write failed'));

    await addOutcomesToReleasedReleases({ strapi });

    expect(logError).toHaveBeenCalledWith(
      'Error while adding outcomes to release 10',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(releaseUpdate.mock.calls).toStrictEqual([
      [
        {
          where: { id: 20 },
          data: { totalPublishedEntries: 2, totalUnpublishedEntries: 1, totalSkippedEntries: 0 },
        },
      ],
    ]);
  });
});
