import type { Schema } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { revalidateChangedContentTypes } from '..';

type OldContentTypes = Parameters<typeof revalidateChangedContentTypes>[0]['oldContentTypes'];

const UID = 'api::article.article';
const REMOVED_UID = 'api::page.page';

const contentTypes = {
  [UID]: {
    uid: UID,
    options: { draftAndPublish: true },
  } as unknown as Schema.ContentType,
};

const createContentType = (uid: string, attributes: Schema.ContentType['attributes']) =>
  ({
    uid,
    options: { draftAndPublish: true },
    attributes,
  }) as unknown as Schema.ContentType;

const entry = { documentId: 'doc-1', locale: 'en', title: 'Hello' };

// Release actions store `entryDocumentId`; they have no `entry` relation to populate
const createPublishAction = (id: number, contentType: string, releaseId: number) => ({
  id,
  type: 'publish',
  contentType,
  entryDocumentId: entry.documentId,
  locale: entry.locale,
  isEntryValid: true,
  release: { id: releaseId },
});

const setupStrapi = (actions: ReturnType<typeof createPublishAction>[]) => {
  const findMany = jest.fn(async ({ where }: { where: { contentType: string } }) =>
    actions.filter((action) => action.contentType === where.contentType)
  );
  const update = jest.fn().mockResolvedValue({});
  const findOne = jest.fn().mockResolvedValue(entry);
  // The new required attribute is missing on the entry
  const validateEntityCreation = jest.fn().mockRejectedValue(new Error('summary is required'));
  const updateReleaseStatus = jest.fn().mockResolvedValue({});
  const populateBuilder = jest.fn(() => ({
    populateDeep: () => ({ build: async () => ({}) }),
  }));
  const documents = jest.fn(() => ({ findOne }));

  global.strapi = {
    db: { query: jest.fn(() => ({ findMany, update })) },
    documents,
    entityValidator: { validateEntityCreation },
    config: { get: jest.fn() },
    getModel: jest.fn(),
    plugins: {
      'content-manager': { services: { 'populate-builder': populateBuilder } },
      'content-releases': { services: { release: { updateReleaseStatus } } },
      'review-workflows': { services: {} },
    },
  } as unknown as typeof global.strapi;

  return { findMany, update, findOne, validateEntityCreation, updateReleaseStatus, documents };
};

const oldAttributes = { title: { type: 'string' } } as Schema.ContentType['attributes'];
const newAttributes = {
  title: { type: 'string' },
  summary: { type: 'string', required: true },
} as Schema.ContentType['attributes'];

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
    const { findMany, update, findOne, validateEntityCreation, updateReleaseStatus } = setupStrapi([
      createPublishAction(1, UID, 10),
    ]);

    await revalidateChangedContentTypes({
      oldContentTypes: { [UID]: createContentType(UID, oldAttributes) },
      contentTypes: { [UID]: createContentType(UID, newAttributes) },
    });

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

  // The model of a deleted content type is gone after the schema sync
  it('skips deleted content types and still revalidates the changed ones', async () => {
    const { findMany, update, documents, updateReleaseStatus } = setupStrapi([
      createPublishAction(1, UID, 10),
      createPublishAction(2, REMOVED_UID, 20),
    ]);

    await revalidateChangedContentTypes({
      oldContentTypes: {
        [UID]: createContentType(UID, oldAttributes),
        [REMOVED_UID]: createContentType(REMOVED_UID, oldAttributes),
      },
      contentTypes: { [UID]: createContentType(UID, newAttributes) },
    });

    expect(documents).not.toHaveBeenCalledWith(REMOVED_UID);
    expect(findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ contentType: REMOVED_UID }) })
    );
    expect(documents).toHaveBeenCalledWith(UID);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isEntryValid: false },
    });
    expect(updateReleaseStatus).toHaveBeenCalledTimes(1);
    expect(updateReleaseStatus).toHaveBeenCalledWith(10);
  });

  // Draft and publish adds `publishedAt` with a function default; the core store drops it
  it('skips revalidation when attributes only differ by values JSON drops', async () => {
    const { findMany, documents, updateReleaseStatus } = setupStrapi([
      createPublishAction(1, UID, 10),
    ]);
    const liveAttributes = {
      ...oldAttributes,
      publishedAt: { type: 'datetime', default: () => new Date() },
    } as unknown as Schema.ContentType['attributes'];
    const savedAttributes = JSON.parse(JSON.stringify(liveAttributes));

    await revalidateChangedContentTypes({
      oldContentTypes: { [UID]: createContentType(UID, savedAttributes) },
      contentTypes: { [UID]: createContentType(UID, liveAttributes) },
    });

    expect(findMany).not.toHaveBeenCalled();
    expect(documents).not.toHaveBeenCalled();
    expect(updateReleaseStatus).not.toHaveBeenCalled();
  });
});
