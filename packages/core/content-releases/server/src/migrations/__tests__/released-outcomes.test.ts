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

  it('selects the released releases that have no totals yet', async () => {
    releaseFindMany.mockResolvedValue([]);

    await addOutcomesToReleasedReleases({ strapi });

    expect(releaseFindMany).toHaveBeenCalledWith({
      where: {
        releasedAt: { $notNull: true },
        totalSkippedEntries: null,
        $or: [
          { status: 'done' },
          { status: null },
          { status: 'failed', failureReason: 'failed_before_upgrade' },
        ],
      },
      select: ['id', 'status'],
    });
  });

  it("records every entry as released and the release's totals", async () => {
    releaseFindMany.mockResolvedValue([{ id: 10, status: 'done' }]);

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

  it('records every entry of a release frozen before upgrade as skipped', async () => {
    releaseFindMany.mockResolvedValue([{ id: 30, status: 'failed' }]);
    actionCount.mockResolvedValue(3);

    await addOutcomesToReleasedReleases({ strapi });

    expect(actionUpdateMany.mock.calls).toStrictEqual([
      [{ where: { release: 30, outcome: null }, data: { outcome: 'skipped_missed' } }],
    ]);
    expect(actionCount).toHaveBeenCalledWith({ where: { release: 30 } });
    expect(releaseUpdate).toHaveBeenCalledWith({
      where: { id: 30 },
      data: { totalPublishedEntries: 0, totalUnpublishedEntries: 0, totalSkippedEntries: 3 },
    });
  });

  it('logs a failed scan instead of stopping the startup', async () => {
    releaseFindMany.mockRejectedValue(new Error('read failed'));

    await expect(addOutcomesToReleasedReleases({ strapi })).resolves.toBeUndefined();

    expect(logError).toHaveBeenCalledWith(
      'Error while finding releases to add outcomes to',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(releaseUpdate).not.toHaveBeenCalled();
  });

  it('logs a release that fails and still migrates the others', async () => {
    releaseFindMany.mockResolvedValue([
      { id: 10, status: 'done' },
      { id: 20, status: null },
    ]);
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
