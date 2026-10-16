import { setImmediate } from 'node:timers/promises';

import type { Schema } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { revalidateChangedContentTypes } from '..';
import type * as utils from '../../utils';

const UID = 'api::article.article';
const VALID = { isEntryValid: true, reason: null };

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

const contentType = (attributes: Record<string, unknown>) =>
  ({ uid: UID, options: { draftAndPublish: true }, attributes }) as unknown as Schema.ContentType;

const setupStrapi = () => {
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
};

const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    await setImmediate();
  }
};

describe('revalidateChangedContentTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStrapi();
    mockGetDraftEntryValidity.mockResolvedValue(VALID);
    actionFindMany.mockResolvedValue([
      { id: 1, entryDocumentId: 'a', locale: 'en', release: { id: 10 } },
      { id: 2, entryDocumentId: 'b', locale: 'en', release: { id: 10 } },
    ]);
  });

  it('revalidates the publish actions of planned releases a run has not recorded', async () => {
    await revalidateChangedContentTypes({
      oldContentTypes: { [UID]: contentType({ title: { type: 'string' } }) },
      contentTypes: { [UID]: contentType({ title: { type: 'string', required: true } }) },
    });
    await flush();

    expect(actionFindMany).toHaveBeenCalledWith({
      where: {
        contentType: UID,
        type: 'publish',
        outcome: null,
        release: { id: { $notNull: true }, releasedAt: { $null: true } },
      },
      populate: { release: { select: ['id'] } },
    });
    expect(actionUpdateMany.mock.calls).toStrictEqual([
      [{ where: { id: 1, outcome: null }, data: VALID }],
      [{ where: { id: 2, outcome: null }, data: VALID }],
    ]);
    expect(updateReleaseStatus.mock.calls).toStrictEqual([[10]]);
  });

  it('leaves unchanged and deleted content types alone', async () => {
    const attributes = { title: { type: 'string' } };

    await revalidateChangedContentTypes({
      oldContentTypes: {
        [UID]: contentType(attributes),
        'api::removed.removed': contentType(attributes),
      },
      contentTypes: { [UID]: contentType(attributes) },
    });
    await flush();

    expect(actionFindMany).not.toHaveBeenCalled();
  });

  it('logs a failure instead of leaving an unhandled rejection', async () => {
    actionUpdateMany.mockRejectedValue(new Error('write failed'));

    await revalidateChangedContentTypes({
      oldContentTypes: { [UID]: contentType({ title: { type: 'string' } }) },
      contentTypes: { [UID]: contentType({ title: { type: 'string', required: true } }) },
    });
    await flush();

    expect(logError).toHaveBeenCalledWith(
      'Error while revalidating release actions after a content type change',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
