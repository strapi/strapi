import { setImmediate } from 'node:timers/promises';

import type { Modules } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { updateActionsOnUpdate } from '../documents';
import type * as utils from '../../utils';

type Context = Parameters<Modules.Documents.Middleware.Middleware>[0];

const UID = 'api::article.article';
const INVALID = {
  isEntryValid: false,
  reason: { validation: { errors: [{ path: ['title'], message: 'title is required' }] } },
};
const PLANNED = {
  contentType: UID,
  entryDocumentId: 'doc-1',
  locale: 'en',
  outcome: null,
  release: { releasedAt: { $null: true } },
};

const mockGetDraftEntryValidity = jest.fn();

jest.mock('../../utils', () => ({
  ...jest.requireActual<typeof utils>('../../utils'),
  getDraftEntryValidity: (...args: Parameters<typeof utils.getDraftEntryValidity>) =>
    mockGetDraftEntryValidity(...args),
}));

const releaseFindMany = jest.fn();
const actionCount = jest.fn();
const actionUpdateMany = jest.fn();
const updateReleaseStatus = jest.fn();
const logError = jest.fn();

const setupStrapi = () => {
  global.strapi = {
    db: {
      query: jest.fn((uid: string) =>
        uid === RELEASE_ACTION_MODEL_UID
          ? { count: actionCount, updateMany: actionUpdateMany }
          : { findMany: releaseFindMany }
      ),
    },
    plugins: { 'content-releases': { services: { release: { updateReleaseStatus } } } },
    log: { error: logError },
  } as unknown as typeof global.strapi;
};

const updateEntry = async () => {
  const ctx = {
    action: 'update',
    contentType: { uid: UID, options: { draftAndPublish: true } },
    params: { documentId: 'doc-1' },
  } as unknown as Context;
  const next = jest.fn().mockResolvedValue({ documentId: 'doc-1', locale: 'en' });

  const result = await updateActionsOnUpdate(ctx, next);
  await setImmediate();

  return result;
};

describe('updateActionsOnUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStrapi();
    releaseFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    actionCount.mockResolvedValue(1);
    mockGetDraftEntryValidity.mockResolvedValue(INVALID);
    // clearAllMocks keeps implementations: undo a failure set by an earlier test
    actionUpdateMany.mockResolvedValue(undefined);
    updateReleaseStatus.mockResolvedValue(undefined);
  });

  it('skips the draft read when the entry is in no planned release', async () => {
    releaseFindMany.mockResolvedValue([]);

    await updateEntry();

    expect(mockGetDraftEntryValidity).not.toHaveBeenCalled();
    expect(actionUpdateMany).not.toHaveBeenCalled();
  });

  it('skips the draft read when the entry only has unpublish actions', async () => {
    actionCount.mockResolvedValue(0);

    await updateEntry();

    expect(mockGetDraftEntryValidity).not.toHaveBeenCalled();
    expect(actionUpdateMany.mock.calls).toStrictEqual([
      [
        {
          where: { ...PLANNED, type: 'unpublish', isEntryValid: false },
          data: { isEntryValid: true, reason: null },
        },
      ],
    ]);
  });

  it("stores the draft's validity and reason on publish actions a run hasn't recorded", async () => {
    await updateEntry();

    expect(actionCount).toHaveBeenCalledWith({ where: { ...PLANNED, type: 'publish' } });
    expect(mockGetDraftEntryValidity).toHaveBeenCalledWith(
      { contentType: UID, documentId: 'doc-1', locale: 'en' },
      expect.anything()
    );
    expect(actionUpdateMany.mock.calls).toStrictEqual([
      [{ where: { ...PLANNED, type: 'publish' }, data: INVALID }],
      [
        {
          where: { ...PLANNED, type: 'unpublish', isEntryValid: false },
          data: { isEntryValid: true, reason: null },
        },
      ],
    ]);
    expect(updateReleaseStatus.mock.calls).toStrictEqual([[1], [2]]);
  });

  it.each([
    ['the draft read', () => mockGetDraftEntryValidity.mockRejectedValue(new Error('read failed'))],
    ['a write', () => actionUpdateMany.mockRejectedValue(new Error('write failed'))],
    [
      'a release status update',
      () => updateReleaseStatus.mockRejectedValue(new Error('status failed')),
    ],
  ])('logs a failure of %s and still returns the updated entry', async (_, fail) => {
    fail();

    const result = await updateEntry();

    expect(result).toEqual({ documentId: 'doc-1', locale: 'en' });
    expect(logError).toHaveBeenCalledWith(
      'Error while updating release actions after update',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
