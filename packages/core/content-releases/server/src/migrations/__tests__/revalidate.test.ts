import type { Schema } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { revalidateChangedContentTypes } from '..';

type OldContentTypes = Parameters<typeof revalidateChangedContentTypes>[0]['oldContentTypes'];

const UID = 'api::article.article';

const contentTypes = {
  [UID]: {
    uid: UID,
    options: { draftAndPublish: true },
  } as unknown as Schema.ContentType,
};

const createContentType = (attributes: Schema.ContentType['attributes']) =>
  ({
    uid: UID,
    options: { draftAndPublish: true },
    attributes,
  }) as unknown as Schema.ContentType;

// The revalidation is not awaited by the hook. The mocks resolve at once, so one macrotask
// lets every pending promise settle.
const flushPromises = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('revalidateChangedContentTypes', () => {
  beforeEach(() => {
    global.strapi = { db: {} } as unknown as typeof global.strapi;
  });

  // The core store table exists but has no saved schemas, e.g. after a first start that failed
  // before saving them. Core then passes `null`, which the `Input` type does not declare.
  it('skips revalidation without saved schemas', async () => {
    await expect(
      revalidateChangedContentTypes({
        oldContentTypes: null as unknown as OldContentTypes,
        contentTypes,
      })
    ).resolves.toBeUndefined();
  });

  // The core store table does not exist yet: core passes `undefined`.
  it('skips revalidation before the core store table exists', async () => {
    await expect(
      revalidateChangedContentTypes({
        oldContentTypes: undefined as unknown as OldContentTypes,
        contentTypes,
      })
    ).resolves.toBeUndefined();
  });

  it('refreshes the validity of publish actions when attributes change', async () => {
    const entry = { documentId: 'doc-1', locale: 'en', title: 'Hello' };
    // Release actions store `entryDocumentId`; they have no `entry` relation to populate
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        type: 'publish',
        contentType: UID,
        entryDocumentId: entry.documentId,
        locale: entry.locale,
        isEntryValid: true,
        release: { id: 10 },
      },
    ]);
    const update = jest.fn().mockResolvedValue({});
    const findOne = jest.fn().mockResolvedValue(entry);
    // The new required attribute is missing on the entry
    const validateEntityCreation = jest.fn().mockRejectedValue(new Error('summary is required'));
    const updateReleaseStatus = jest.fn().mockResolvedValue({});
    const populateBuilder = jest.fn(() => ({
      populateDeep: () => ({ build: async () => ({}) }),
    }));

    global.strapi = {
      db: { query: jest.fn(() => ({ findMany, update })) },
      documents: jest.fn(() => ({ findOne })),
      entityValidator: { validateEntityCreation },
      config: { get: jest.fn() },
      getModel: jest.fn(),
      plugins: {
        'content-manager': { services: { 'populate-builder': populateBuilder } },
        'content-releases': { services: { release: { updateReleaseStatus } } },
        'review-workflows': { services: {} },
      },
    } as unknown as typeof global.strapi;

    await revalidateChangedContentTypes({
      oldContentTypes: { [UID]: createContentType({ title: { type: 'string' } }) },
      contentTypes: {
        [UID]: createContentType({
          title: { type: 'string' },
          summary: { type: 'string', required: true },
        }),
      },
    });
    await flushPromises();

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: entry.documentId, locale: entry.locale })
    );
    expect(strapi.db.query).toHaveBeenCalledWith(RELEASE_ACTION_MODEL_UID);
    // Released releases must keep their `done` status
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contentType: UID, release: { releasedAt: { $null: true } } },
      })
    );
    expect(validateEntityCreation).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isEntryValid: false },
    });
    expect(updateReleaseStatus).toHaveBeenCalledWith(10);
  });
});
