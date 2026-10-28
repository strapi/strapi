import { setImmediate } from 'node:timers/promises';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { migrateIsValidAndStatusReleases } from '..';
import type * as utils from '../../utils';

const INVALID = {
  isEntryValid: false,
  reason: { validation: { errors: [{ path: ['title'], message: 'title is required' }] } },
};

const actualUtils = jest.requireActual<typeof utils>('../../utils');

// Publish drafts read as invalid; unpublish actions keep the real rule
const mockGetActionValidity = jest.fn<
  ReturnType<typeof utils.getActionValidity>,
  Parameters<typeof utils.getActionValidity>
>(async (action, options) =>
  action.type === 'publish' ? INVALID : actualUtils.getActionValidity(action, options)
);

jest.mock('../../utils', () => ({
  ...jest.requireActual<typeof utils>('../../utils'),
  getActionValidity: (...args: Parameters<typeof utils.getActionValidity>) =>
    mockGetActionValidity(...args),
}));

const releaseFindMany = jest.fn();
const releaseUpdateMany = jest.fn();
const actionUpdateMany = jest.fn();
const updateReleaseStatus = jest.fn();
const logError = jest.fn();

// The migration isn't awaited by startup: let it run
const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    await setImmediate();
  }
};

const action = (id: number, type: 'publish' | 'unpublish') => ({
  id,
  type,
  contentType: 'api::a.a',
  entryDocumentId: `doc-${id}`,
  locale: 'en',
  isEntryValid: null,
});

describe('migrateIsValidAndStatusReleases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.strapi = {
      db: {
        inTransaction: () => false,
        query: jest.fn((uid: string) =>
          uid === RELEASE_ACTION_MODEL_UID
            ? { updateMany: actionUpdateMany }
            : { findMany: releaseFindMany, updateMany: releaseUpdateMany }
        ),
      },
      plugins: { 'content-releases': { services: { release: { updateReleaseStatus } } } },
      log: { error: logError },
    } as unknown as typeof global.strapi;
  });

  it('stores each action validity, without overwriting what a run recorded', async () => {
    releaseFindMany.mockResolvedValue([
      { id: 10, actions: [action(1, 'publish'), action(2, 'unpublish')] },
    ]);

    await migrateIsValidAndStatusReleases({ strapi });
    await flush();

    expect(actionUpdateMany.mock.calls).toStrictEqual([
      [{ where: { id: 1, outcome: null }, data: INVALID }],
      [{ where: { id: 2, outcome: null }, data: { isEntryValid: true, reason: null } }],
    ]);
    expect(updateReleaseStatus.mock.calls).toStrictEqual([[10]]);
  });

  it('logs a release that fails and still migrates the others', async () => {
    releaseFindMany.mockResolvedValue([
      { id: 10, actions: [action(1, 'publish')] },
      { id: 20, actions: [action(2, 'publish')] },
    ]);
    actionUpdateMany.mockRejectedValueOnce(new Error('write failed'));

    await migrateIsValidAndStatusReleases({ strapi });
    await flush();

    expect(logError).toHaveBeenCalledWith(
      'Error while migrating the status of release 10',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(updateReleaseStatus.mock.calls).toStrictEqual([[20]]);
    expect(releaseUpdateMany).toHaveBeenCalledWith({
      where: { status: null, releasedAt: { $notNull: true } },
      data: { status: 'done' },
    });
  });
});
