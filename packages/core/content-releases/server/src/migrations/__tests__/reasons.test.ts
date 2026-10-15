import { setImmediate } from 'node:timers/promises';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { addReasonsToInvalidActions } from '..';
import type * as utils from '../../utils';

const INVALID = {
  isEntryValid: false,
  reason: { validation: { errors: [{ path: ['title'], message: 'title is required' }] } },
};

const mockGetDraftEntryValidity = jest.fn();

jest.mock('../../utils', () => ({
  ...jest.requireActual<typeof utils>('../../utils'),
  getDraftEntryValidity: (...args: Parameters<typeof utils.getDraftEntryValidity>) =>
    mockGetDraftEntryValidity(...args),
}));

const actionFindMany = jest.fn();
const actionUpdateMany = jest.fn();
const updateReleaseStatus = jest.fn();
const logError = jest.fn();

// The pass isn't awaited by startup: let it run
const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    await setImmediate();
  }
};

describe('addReasonsToInvalidActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDraftEntryValidity.mockResolvedValue(INVALID);
    global.strapi = {
      db: {
        query: jest.fn((uid: string) =>
          uid === RELEASE_ACTION_MODEL_UID
            ? { findMany: actionFindMany, updateMany: actionUpdateMany }
            : {}
        ),
      },
      plugins: { 'content-releases': { services: { release: { updateReleaseStatus } } } },
      log: { error: logError },
    } as unknown as typeof global.strapi;
  });

  it('only looks at planned publish actions stored as invalid without a reason', async () => {
    actionFindMany.mockResolvedValue([]);

    await addReasonsToInvalidActions();
    await flush();

    expect(actionFindMany).toHaveBeenCalledWith({
      where: {
        type: 'publish',
        isEntryValid: false,
        reason: { $null: true },
        outcome: null,
        release: { releasedAt: { $null: true } },
      },
      populate: { release: { select: ['id'] } },
    });
    expect(mockGetDraftEntryValidity).not.toHaveBeenCalled();
    expect(actionUpdateMany).not.toHaveBeenCalled();
  });

  it("stores each action's reason, unless a run recorded it, and recalculates its release", async () => {
    actionFindMany.mockResolvedValue([
      { id: 1, contentType: 'api::a.a', entryDocumentId: 'a', locale: 'en', release: { id: 10 } },
      { id: 2, contentType: 'api::a.a', entryDocumentId: 'b', locale: 'en', release: { id: 10 } },
    ]);

    await addReasonsToInvalidActions();
    await flush();

    expect(actionUpdateMany.mock.calls).toStrictEqual([
      [{ where: { id: 1, outcome: null }, data: INVALID }],
      [{ where: { id: 2, outcome: null }, data: INVALID }],
    ]);
    expect(updateReleaseStatus.mock.calls).toStrictEqual([[10]]);
  });

  it('logs a failure instead of leaving an unhandled rejection', async () => {
    actionFindMany.mockResolvedValue([
      { id: 1, contentType: 'api::a.a', entryDocumentId: 'a', locale: 'en', release: { id: 10 } },
    ]);
    actionUpdateMany.mockRejectedValue(new Error('write failed'));

    await addReasonsToInvalidActions();
    await flush();

    expect(logError).toHaveBeenCalledWith(
      'Error while adding reasons to release actions that are not publishable',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
