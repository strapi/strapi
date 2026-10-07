'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';

import type {
  CreateRelease,
  ReleaseCondition,
} from '../../../../packages/core/content-releases/shared/contracts/releases';
import { migrateReleaseConditionReleases } from '../../../../packages/core/content-releases/server/src/migrations';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const productUID = 'api::product.product';
const productModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'string',
      required: true,
    },
  },
};

const categoryUID = 'api::category.category';
const categoryModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
  },
};

const articleUID = 'api::article.article';
const articleModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  kind: 'collectionType',
  attributes: {
    title: { type: 'string' },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
    },
  },
};

const pageUID = 'api::page.page';
const pageModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'page',
  pluralName: 'pages',
  displayName: 'Page',
  kind: 'collectionType',
  attributes: {
    title: { type: 'string' },
    parent: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::page.page',
      targetAttribute: 'children',
    },
  },
};

// Only used by the review-workflow stage tests, so the workflow they assign doesn't affect the others
const reviewItemUID = 'api::review-item.review-item';
const reviewItemModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'review-item',
  pluralName: 'review-items',
  displayName: 'Review Item',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
  },
};

// Only used by the unique-value tests: a `uid` field must be unique among published entries
const slugItemUID = 'api::slug-item.slug-item';
const slugItemModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'slug-item',
  pluralName: 'slug-items',
  displayName: 'Slug Item',
  kind: 'collectionType',
  attributes: {
    title: { type: 'string' },
    slug: { type: 'uid' },
  },
};

const INVALID_PRODUCT_MESSAGE =
  'description must be a `string` type, but the final value was: `null`.';

describeOnCondition(edition === 'EE')('Content Releases API', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let rqContent;
  let validEntries = [];
  let invalidEntries = [];
  // Publishing one of these documents throws, through a test-only document middleware
  const documentIdsFailingToPublish = new Set<string>();

  const createRelease = async (params: Partial<CreateRelease.Request['body']> = {}) => {
    return rq({
      method: 'POST',
      url: '/content-releases/',
      body: {
        name: `Test Release ${Math.random().toString(36)}`,
        scheduledAt: null,
        ...params,
      },
    });
  };

  const createReleaseAction = async (releaseId, { contentType, entryDocumentId, type }) => {
    return rq({
      method: 'POST',
      url: `/content-releases/${releaseId}/actions`,
      body: {
        entryDocumentId,
        contentType,
        type,
      },
    });
  };

  const deleteAllReleases = async () => {
    // Released (frozen) releases can't be deleted and pile up across tests: only list the
    // pending ones, on a page large enough to hold them all
    const releases = await rq({
      method: 'GET',
      url: '/content-releases',
      qs: { filters: { releasedAt: { $notNull: false } }, pageSize: 100 },
    });

    await Promise.all(
      releases.body.data.map(async (release) => {
        await rq({
          method: 'DELETE',
          url: `/content-releases/${release.id}`,
        });
      })
    );
  };

  const createEntry = async (uid, data) => {
    const { body } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${uid}`,
      body: data,
    });

    return body;
  };

  // A fresh product per test, so publishing it doesn't leak into other tests
  const createProduct = async ({ valid }: { valid: boolean }): Promise<string> => {
    const { data } = await createEntry(productUID, {
      name: valid ? 'Valid product' : 'Invalid product',
      ...(valid && { description: 'Description' }),
    });

    return data.documentId;
  };

  const createReleaseWithActions = async (
    releaseCondition: ReleaseCondition,
    actions: { documentId: string; type?: 'publish' | 'unpublish'; contentType?: string }[]
  ) => {
    const release = (await createRelease({ releaseCondition })).body.data;

    // One at a time: a run handles the actions of a content type in the order they were added
    for (const { documentId, type = 'publish', contentType = productUID } of actions) {
      const res = await createReleaseAction(release.id, {
        contentType,
        entryDocumentId: documentId,
        type,
      });
      expect(res.statusCode).toBe(201);
    }

    return release;
  };

  const getRelease = async (id) => {
    const res = await rq({ method: 'GET', url: `/content-releases/${id}` });

    return res.body.data;
  };

  const hasPublishedVersion = async (uid, documentId) => {
    const published = await strapi.documents(uid).findOne({ documentId, status: 'published' });

    return published !== null;
  };

  const publishManually = (releaseId) => {
    return rq({ method: 'POST', url: `/content-releases/${releaseId}/publish` });
  };

  // What the scheduler's task runs when the release date is reached
  const runScheduled = (releaseId) => {
    return strapi
      .plugin('content-releases')
      .service('release')
      .publish(releaseId, { trigger: 'scheduled' });
  };

  beforeAll(async () => {
    await builder
      .addContentType(productModel)
      .addContentTypes([categoryModel, articleModel, pageModel, reviewItemModel, slugItemModel])
      .build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    rqContent = createContentAPIRequest({ strapi });

    strapi.documents.use((ctx, next) => {
      if (ctx.action === 'publish' && documentIdsFailingToPublish.has(ctx.params?.documentId)) {
        throw new Error('Test-only publish failure');
      }

      return next();
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    // Create products
    validEntries = await Promise.all([
      createEntry(productUID, { name: 'Product 1', description: 'Description' }),
      createEntry(productUID, { name: 'Product 2', description: 'Description' }),
      createEntry(productUID, { name: 'Product 3', description: 'Description' }),
      createEntry(productUID, { name: 'Product 4', description: 'Description' }),
      createEntry(productUID, { name: 'Invalid Product' }),
    ]);

    invalidEntries = await Promise.all([createEntry(productUID, { name: 'Invalid Product' })]);
  });

  beforeEach(async () => {
    await deleteAllReleases();
  });

  afterAll(async () => {
    jest.useRealTimers();

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create Release', () => {
    test('Create a release', async () => {
      const res = await createRelease();

      expect(res.statusCode).toBe(201);
    });

    test('cannot create a release with the same name', async () => {
      const firstCreateRes = await createRelease();
      expect(firstCreateRes.statusCode).toBe(201);

      const releaseName = firstCreateRes.body.data.name;

      const secondCreateRes = await createRelease({ name: releaseName });

      expect(secondCreateRes.body.error.message).toBe(
        `Release with name ${releaseName} already exists`
      );
    });

    test('create a scheduled release', async () => {
      const res = await createRelease({
        scheduledAt: new Date('2024-10-10T00:00:00.000Z'),
        timezone: 'Europe/Madrid',
      });

      expect(res.statusCode).toBe(201);
    });

    test('cannot create a scheduled release with date in the past', async () => {
      const res = await createRelease({
        scheduledAt: new Date('2022-10-10T00:00:00.000Z'),
        timezone: 'Europe/Madrid',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Scheduled at must be later than now');
    });

    test('defaults the release condition to all_or_nothing', async () => {
      const res = await createRelease();

      expect(res.statusCode).toBe(201);
      expect(res.body.data.releaseCondition).toBe('all_or_nothing');
    });

    test('create a release with an explicit release condition', async () => {
      const res = await createRelease({ releaseCondition: 'allow_partial' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.releaseCondition).toBe('allow_partial');

      const findRes = await rq({ method: 'GET', url: `/content-releases/${res.body.data.id}` });
      expect(findRes.body.data.releaseCondition).toBe('allow_partial');
    });

    test.each(['publish_everything', null])(
      'cannot create a release with release condition %p',
      async (releaseCondition) => {
        const res = await rq({
          method: 'POST',
          url: '/content-releases/',
          body: { name: `Test Release ${Math.random().toString(36)}`, releaseCondition },
        });

        expect(res.statusCode).toBe(400);
      }
    );
  });

  describe('Create Release Actions', () => {
    test('Create a release action with valid status', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const createActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });

      expect(createActionRes.statusCode).toBe(201);
      expect(createActionRes.body.data.isEntryValid).toBe(true);
    });

    test('Create a release action with invalid status', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const createActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: invalidEntries[0].data.documentId,
        type: 'publish',
      });

      expect(createActionRes.statusCode).toBe(201);
      expect(createActionRes.body.data.isEntryValid).toBe(false);
    });

    test('cannot create an action with invalid contentTypeUid', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const createActionRes = await createReleaseAction(release.id, {
        contentType: 'invalid',
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });

      expect(createActionRes.statusCode).toBe(404);
      expect(createActionRes.body.error.message).toBe('No content type found for uid invalid');
    });

    test('throws an error when trying to add an entry that is already in the release', async () => {
      const createReleaseRes = await createRelease();
      const release = createReleaseRes.body.data;

      const firstCreateActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });
      expect(firstCreateActionRes.statusCode).toBe(201);

      const secondCreateActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });

      expect(secondCreateActionRes.statusCode).toBe(400);
      expect(secondCreateActionRes.body.error.message).toBe(
        `Entry with documentId ${validEntries[0].data.documentId} and contentType api::product.product already exists in release with id ${release.id}`
      );
    });
  });

  describe('Create Many Release Actions', () => {
    test('Create many release actions', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions/bulk`,
        body: [
          {
            entryDocumentId: validEntries[0].data.documentId,
            contentType: productUID,
            type: 'publish',
          },
          {
            entryDocumentId: validEntries[1].data.documentId,
            contentType: productUID,
            type: 'publish',
          },
        ],
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.meta.entriesAlreadyInRelease).toBe(0);
      expect(res.body.meta.totalEntries).toBe(2);
    });

    test('If entry is already in the release, it should not be added', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const createActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });
      expect(createActionRes.statusCode).toBe(201);

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions/bulk`,
        body: [
          {
            contentType: productUID,
            entryDocumentId: validEntries[0].data.documentId,
            type: 'publish',
          },
          {
            contentType: productUID,
            entryDocumentId: validEntries[1].data.documentId,
            type: 'publish',
          },
        ],
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.meta.entriesAlreadyInRelease).toBe(1);
      expect(res.body.meta.totalEntries).toBe(2);
    });
  });

  describe('Find Many Release Actions', () => {
    test('Find many release actions', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[1].data.documentId,
        type: 'publish',
      });

      const res = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}/actions`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.Product.length).toBe(2);
    });

    test('Group by action type', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[1].data.documentId,
        type: 'publish',
      });
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[2].data.documentId,
        type: 'unpublish',
      });

      const res = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}/actions?groupBy=action`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.publish.length).toBe(2);
      expect(res.body.data.unpublish.length).toBe(1);
    });
  });

  describe('Edit Release Action', () => {
    test('Edit a release action', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const createActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });

      expect(createActionRes.statusCode).toBe(201);
      const releaseAction = createActionRes.body.data;

      const changeToUnpublishRes = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}/actions/${releaseAction.id}`,
        body: {
          type: 'unpublish',
        },
      });

      expect(changeToUnpublishRes.statusCode).toBe(200);
      expect(changeToUnpublishRes.body.data.type).toBe('unpublish');

      const changeToPublishRes = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}/actions/${releaseAction.id}`,
        body: {
          type: 'publish',
        },
      });

      expect(changeToPublishRes.statusCode).toBe(200);
      expect(changeToPublishRes.body.data.type).toBe('publish');
    });
  });

  describe('Delete a Release Action', () => {
    test('Delete a release action', async () => {
      const createReleaseRes = await createRelease();
      const release = createReleaseRes.body.data;

      const createActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });
      const releaseAction = createActionRes.body.data;

      const res = await rq({
        method: 'DELETE',
        url: `/content-releases/${release.id}/actions/${releaseAction.id}`,
      });

      expect(res.statusCode).toBe(200);

      const findRes = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}/actions`,
      });

      expect(findRes.statusCode).toBe(200);
    });

    test('cannot delete a release action that does not exist', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const res = await rq({
        method: 'DELETE',
        url: `/content-releases/${release.id}/actions/1`,
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe(
        `Action with id 1 not found in release with id ${release.id} or it is already published`
      );
    });
  });

  describe('Find One Release', () => {
    test('Find a release', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const createActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });

      expect(createActionRes.statusCode).toBe(201);

      const res = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe(release.name);
      expect(res.body.data.status).toBe('ready');
    });

    test('Release status is empty if doesnt have any actions', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const res = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe(release.name);
      expect(res.body.data.status).toBe('empty');
    });

    test('Release status is blocked if at least one action is invalid and then change to ready if removed', async () => {
      const createReleaseRes = await createRelease();
      const release = createReleaseRes.body.data;

      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });
      const createActionRes = await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: invalidEntries[0].data.documentId,
        type: 'publish',
      });
      const releaseAction = createActionRes.body.data;

      const findBlockedRes = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}`,
      });

      expect(findBlockedRes.statusCode).toBe(200);
      expect(findBlockedRes.body.data.name).toBe(release.name);
      expect(findBlockedRes.body.data.status).toBe('blocked');

      const removeEntryRes = await rq({
        method: 'DELETE',
        url: `/content-releases/${release.id}/actions/${releaseAction.id}`,
      });

      expect(removeEntryRes.statusCode).toBe(200);

      const findReadyRes = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}`,
      });

      expect(findReadyRes.statusCode).toBe(200);
      expect(findReadyRes.body.data.name).toBe(release.name);
      expect(findReadyRes.body.data.status).toBe('ready');
    });
  });

  describe('Edit Release', () => {
    test('Edit a release', async () => {
      const createReleaseRes = await createRelease();
      expect(createReleaseRes.statusCode).toBe(201);

      const release = createReleaseRes.body.data;

      const res = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}`,
        body: {
          name: 'Updated Release',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Release');
    });

    test('cannot change to a name that already exists', async () => {
      const createFirstReleaseRes = await createRelease();
      const createSecondReleaseRes = await createRelease();

      const res = await rq({
        method: 'PUT',
        url: `/content-releases/${createFirstReleaseRes.body.data.id}`,
        body: {
          name: createSecondReleaseRes.body.data.name,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe(
        `Release with name ${createSecondReleaseRes.body.data.name} already exists`
      );
    });

    test('changes the release condition and keeps it when omitted', async () => {
      const createReleaseRes = await createRelease();
      const release = createReleaseRes.body.data;

      const conditionRes = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}`,
        body: { name: release.name, releaseCondition: 'allow_partial' },
      });
      expect(conditionRes.statusCode).toBe(200);
      expect(conditionRes.body.data.releaseCondition).toBe('allow_partial');

      const renameRes = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}`,
        body: { name: 'Renamed Release' },
      });
      expect(renameRes.statusCode).toBe(200);
      expect(renameRes.body.data.releaseCondition).toBe('allow_partial');
    });

    test.each(['publish_everything', null])(
      'cannot change to release condition %p',
      async (releaseCondition) => {
        const createReleaseRes = await createRelease({ releaseCondition: 'allow_partial' });
        const release = createReleaseRes.body.data;

        const res = await rq({
          method: 'PUT',
          url: `/content-releases/${release.id}`,
          body: { name: release.name, releaseCondition },
        });
        expect(res.statusCode).toBe(400);

        const findRes = await rq({ method: 'GET', url: `/content-releases/${release.id}` });
        expect(findRes.body.data.releaseCondition).toBe('allow_partial');
      }
    );
  });

  describe('Legacy releases', () => {
    test('backfills a missing release condition to all_or_nothing and keeps explicit ones', async () => {
      const legacy = (await createRelease()).body.data;
      const allowPartial = (await createRelease({ releaseCondition: 'allow_partial' })).body.data;

      // Releases created before the field existed have no value in the column
      await strapi.db.query('plugin::content-releases.release').update({
        where: { id: legacy.id },
        data: { releaseCondition: null },
      });

      await migrateReleaseConditionReleases();

      const legacyRes = await rq({ method: 'GET', url: `/content-releases/${legacy.id}` });
      const allowPartialRes = await rq({
        method: 'GET',
        url: `/content-releases/${allowPartial.id}`,
      });

      expect(legacyRes.body.data.releaseCondition).toBe('all_or_nothing');
      expect(allowPartialRes.body.data.releaseCondition).toBe('allow_partial');
    });
  });

  describe('Publish Release', () => {
    test('Publish a release', async () => {
      const createFirstReleaseRes = await createRelease();
      const release = createFirstReleaseRes.body.data;
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('done');
    });

    test('cannot publish a release that is already published', async () => {
      const createFirstReleaseRes = await createRelease();
      const release = createFirstReleaseRes.body.data;
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      });

      const firstPublishRes = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });

      expect(firstPublishRes.statusCode).toBe(200);
      expect(firstPublishRes.body.data.status).toBe('done');

      const secondPublishRes = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });

      expect(secondPublishRes.statusCode).toBe(400);
      expect(secondPublishRes.body.error.message).toBe('Release already published');
    });

    test('cannot publish a release if at least one action is invalid', async () => {
      const createFirstReleaseRes = await createRelease();
      const release = createFirstReleaseRes.body.data;
      // Created before the invalid action, so it comes first in the run
      const validDocumentId = await createProduct({ valid: true });
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validDocumentId,
        type: 'publish',
      });
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: invalidEntries[0].data.documentId,
        type: 'publish',
      });

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe(
        'description must be a `string` type, but the final value was: `null`.'
      );

      // Rejected before any write: the release stays planned
      const found = await getRelease(release.id);
      expect(found.status).toBe('blocked');
      expect(found.releasedAt).toBeNull();
      expect(await hasPublishedVersion(productUID, validDocumentId)).toBe(false);
    });

    test('retrieves relations correctly in content API after publishing release', async () => {
      const categoryEntry = await createEntry(categoryUID, { name: 'Tech' });
      const articleEntry = await createEntry(articleUID, {
        title: 'My Article',
        categories: [{ documentId: categoryEntry.data.documentId }],
      });

      const createReleaseRes = await createRelease();
      const release = createReleaseRes.body.data;

      await createReleaseAction(release.id, {
        contentType: categoryUID,
        entryDocumentId: categoryEntry.data.documentId,
        type: 'publish',
      });
      await createReleaseAction(release.id, {
        contentType: articleUID,
        entryDocumentId: articleEntry.data.documentId,
        type: 'publish',
      });

      const publishRes = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });
      expect(publishRes.statusCode).toBe(200);
      expect(publishRes.body.data.status).toBe('done');

      const apiRes = await rqContent({
        method: 'GET',
        url: `/articles`,
        qs: { populate: 'categories' },
      });

      expect(apiRes.statusCode).toBe(200);
      expect(apiRes.body.data).toHaveLength(1);

      const article = apiRes.body.data[0];
      expect(article.attributes?.title ?? article.title).toBe('My Article');

      const categories =
        article.attributes?.categories?.data ??
        article.attributes?.categories ??
        article.categories;
      expect(categories).toBeDefined();
      const categoryList = Array.isArray(categories) ? categories : [categories];
      expect(categoryList).toHaveLength(1);
      const categoryData = categoryList[0];
      const categoryName = categoryData.attributes?.name ?? categoryData.name;
      expect(categoryName).toBe('Tech');
    });

    test('publishes a release when a self-relation target was modified between related sources', async () => {
      const parentPage = await createEntry(pageUID, { title: 'Initial Parent Page' });
      await strapi.documents(pageUID).publish({ documentId: parentPage.data.documentId });
      const firstChildPage = await createEntry(pageUID, {
        title: 'First child with modified relation target',
        parent: { documentId: parentPage.data.documentId, locale: null },
      });
      const secondChildPage = await createEntry(pageUID, {
        title: 'Second child with modified relation target',
        parent: { documentId: parentPage.data.documentId, locale: null },
      });

      const createReleaseRes = await createRelease();
      const release = createReleaseRes.body.data;

      await createReleaseAction(release.id, {
        contentType: pageUID,
        entryDocumentId: firstChildPage.data.documentId,
        type: 'publish',
      });

      await strapi.documents(pageUID).update({
        documentId: parentPage.data.documentId,
        data: { title: 'Updated Parent Page' },
      });

      await createReleaseAction(release.id, {
        contentType: pageUID,
        entryDocumentId: parentPage.data.documentId,
        type: 'publish',
      });

      await createReleaseAction(release.id, {
        contentType: pageUID,
        entryDocumentId: secondChildPage.data.documentId,
        type: 'publish',
      });

      const publishRes = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });

      expect(publishRes.statusCode).toBe(200);
      expect(publishRes.body.data.status).toBe('done');

      const firstPublishedChildRes = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/${pageUID}/${firstChildPage.data.documentId}`,
        qs: { status: 'published' },
      });
      const secondPublishedChildRes = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/${pageUID}/${secondChildPage.data.documentId}`,
        qs: { status: 'published' },
      });

      expect(firstPublishedChildRes.statusCode).toBe(200);
      expect(firstPublishedChildRes.body.data.parent).toMatchObject({ count: 1 });
      expect(secondPublishedChildRes.statusCode).toBe(200);
      expect(secondPublishedChildRes.body.data.parent).toMatchObject({ count: 1 });
    });

    test('publishes self-related parent and child in one release and preserves relation', async () => {
      const parentPage = await createEntry(pageUID, { title: 'Parent Page' });
      const childPage = await createEntry(pageUID, {
        title: 'Child Page',
        parent: { documentId: parentPage.data.documentId, locale: null },
      });

      const createReleaseRes = await createRelease();
      const release = createReleaseRes.body.data;

      await createReleaseAction(release.id, {
        contentType: pageUID,
        entryDocumentId: parentPage.data.documentId,
        type: 'publish',
      });
      await createReleaseAction(release.id, {
        contentType: pageUID,
        entryDocumentId: childPage.data.documentId,
        type: 'publish',
      });

      const publishRes = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });

      expect(publishRes.statusCode).toBe(200);
      expect(publishRes.body.data.status).toBe('done');

      const publishedChildRes = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/${pageUID}/${childPage.data.documentId}`,
        qs: { status: 'published' },
      });

      expect(publishedChildRes.statusCode).toBe(200);
      expect(publishedChildRes.body.data.parent).toMatchObject({ count: 1 });
    });
  });

  describe('Release status with a release condition', () => {
    const switchCondition = (release, releaseCondition: ReleaseCondition) => {
      return rq({
        method: 'PUT',
        url: `/content-releases/${release.id}`,
        body: { name: release.name, releaseCondition },
      });
    };

    test('an allow_partial release with an invalid entry among valid ones is ready, and switching the condition recalculates it', async () => {
      const release = await createReleaseWithActions('allow_partial', [
        { documentId: await createProduct({ valid: true }) },
        { documentId: await createProduct({ valid: false }) },
      ]);

      expect((await getRelease(release.id)).status).toBe('ready');

      expect((await switchCondition(release, 'all_or_nothing')).statusCode).toBe(200);
      expect((await getRelease(release.id)).status).toBe('blocked');

      expect((await switchCondition(release, 'allow_partial')).statusCode).toBe(200);
      expect((await getRelease(release.id)).status).toBe('ready');
    });

    test('an allow_partial release with no publishable entry is blocked', async () => {
      const release = await createReleaseWithActions('allow_partial', [
        { documentId: await createProduct({ valid: false }) },
        { documentId: await createProduct({ valid: false }) },
      ]);

      expect((await getRelease(release.id)).status).toBe('blocked');
    });

    test('an allow_partial release with only unpublish entries is ready', async () => {
      const release = await createReleaseWithActions('allow_partial', [
        { documentId: await createProduct({ valid: false }), type: 'unpublish' },
      ]);

      expect((await getRelease(release.id)).status).toBe('ready');
    });
  });

  describe('Publish Release with a release condition', () => {
    test('allow_partial publishes the publishable entries, skips the others and ends partial', async () => {
      const validIds: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        validIds.push(await createProduct({ valid: true }));
      }
      const invalidIds = [
        await createProduct({ valid: false }),
        await createProduct({ valid: false }),
      ];
      const failingId = await createProduct({ valid: true });
      documentIdsFailingToPublish.add(failingId);

      try {
        // The failing entry sits in the middle of the run, with valid entries on both sides
        const release = await createReleaseWithActions(
          'allow_partial',
          [
            validIds[0],
            invalidIds[0],
            validIds[1],
            validIds[2],
            failingId,
            validIds[3],
            invalidIds[1],
            validIds[4],
            validIds[5],
            validIds[6],
          ].map((documentId) => ({ documentId }))
        );

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('partial');

        const found = await getRelease(release.id);
        expect(found.status).toBe('partial');
        expect(found.releasedAt).not.toBeNull();

        for (const documentId of validIds) {
          expect(await hasPublishedVersion(productUID, documentId)).toBe(true);
        }
        for (const documentId of [...invalidIds, failingId]) {
          expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
        }
      } finally {
        documentIdsFailingToPublish.delete(failingId);
      }
    });

    test('allow_partial keeps the published version of an entry whose draft became invalid', async () => {
      const documentId = await createProduct({ valid: true });
      await strapi.documents(productUID).publish({ documentId });
      await strapi.documents(productUID).update({ documentId, data: { description: null } });

      const release = await createReleaseWithActions('allow_partial', [
        { documentId },
        { documentId: await createProduct({ valid: true }) },
      ]);

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('partial');

      const published = await strapi.documents(productUID).findOne({
        documentId,
        status: 'published',
      });
      expect(published?.description).toBe('Description');
    });

    test('allow_partial with only an unpublish entry released ends partial', async () => {
      const publishedId = await createProduct({ valid: true });
      await strapi.documents(productUID).publish({ documentId: publishedId });

      const release = await createReleaseWithActions('allow_partial', [
        { documentId: await createProduct({ valid: false }) },
        { documentId: await createProduct({ valid: false }) },
        { documentId: publishedId, type: 'unpublish' },
      ]);

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('partial');
      expect(await hasPublishedVersion(productUID, publishedId)).toBe(false);
    });

    test('allow_partial with no publishable entry: a manual publish is rejected and the release stays blocked', async () => {
      const invalidIds = [
        await createProduct({ valid: false }),
        await createProduct({ valid: false }),
      ];
      const release = await createReleaseWithActions(
        'allow_partial',
        invalidIds.map((documentId) => ({ documentId }))
      );

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe(INVALID_PRODUCT_MESSAGE);

      const found = await getRelease(release.id);
      expect(found.status).toBe('blocked');
      expect(found.releasedAt).toBeNull();
      for (const documentId of invalidIds) {
        expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
      }
    });

    test('allow_partial with no publishable entry: a scheduled run fails', async () => {
      const invalidIds = [
        await createProduct({ valid: false }),
        await createProduct({ valid: false }),
      ];
      const release = await createReleaseWithActions(
        'allow_partial',
        invalidIds.map((documentId) => ({ documentId }))
      );

      await expect(runScheduled(release.id)).rejects.toThrow('No entries were published');

      const found = await getRelease(release.id);
      expect(found.status).toBe('failed');
      expect(found.releasedAt).toBeNull();
      for (const documentId of invalidIds) {
        expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
      }
    });

    test('scheduled all_or_nothing run with an invalid entry publishes nothing and ends failed', async () => {
      // Ordered before the invalid entry: a run that wrote as it went would commit it
      const validId = await createProduct({ valid: true });
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: validId },
        { documentId: await createProduct({ valid: false }) },
      ]);

      await expect(runScheduled(release.id)).rejects.toThrow(INVALID_PRODUCT_MESSAGE);

      const found = await getRelease(release.id);
      expect(found.status).toBe('failed');
      expect(await hasPublishedVersion(productUID, validId)).toBe(false);
    });

    test('all_or_nothing manual publish stores the validity it found, so out-of-date state reads blocked', async () => {
      const validId = await createProduct({ valid: true });
      const invalidId = await createProduct({ valid: false });
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: validId },
        { documentId: invalidId },
      ]);

      // The stored validity no longer matches the entry, as when the entry changes through a
      // path that doesn't revalidate its release actions
      await strapi.db
        .query('plugin::content-releases.release-action')
        .updateMany({ where: { release: { id: release.id } }, data: { isEntryValid: true } });
      await strapi.plugin('content-releases').service('release').updateReleaseStatus(release.id);
      expect((await getRelease(release.id)).status).toBe('ready');

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe(INVALID_PRODUCT_MESSAGE);

      const invalidAction = await strapi.db
        .query('plugin::content-releases.release-action')
        .findOne({ where: { release: { id: release.id }, entryDocumentId: invalidId } });
      expect(invalidAction.isEntryValid).toBe(false);

      const found = await getRelease(release.id);
      expect(found.status).toBe('blocked');
      expect(found.releasedAt).toBeNull();
      expect(await hasPublishedVersion(productUID, validId)).toBe(false);
    });

    test('all_or_nothing run stopped by an error keeps what went out and ends partial', async () => {
      const documentIds: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        documentIds.push(await createProduct({ valid: true }));
      }
      documentIdsFailingToPublish.add(documentIds[2]);

      try {
        const release = await createReleaseWithActions(
          'all_or_nothing',
          documentIds.map((documentId) => ({ documentId }))
        );

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(500);

        const found = await getRelease(release.id);
        expect(found.status).toBe('partial');
        expect(found.releasedAt).not.toBeNull();

        expect(await hasPublishedVersion(productUID, documentIds[0])).toBe(true);
        expect(await hasPublishedVersion(productUID, documentIds[1])).toBe(true);
        for (const documentId of documentIds.slice(2)) {
          expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
        }
      } finally {
        documentIdsFailingToPublish.delete(documentIds[2]);
      }
    });

    test('all_or_nothing run stopped by an error on its first entry ends failed', async () => {
      const documentIds = [
        await createProduct({ valid: true }),
        await createProduct({ valid: true }),
      ];
      documentIdsFailingToPublish.add(documentIds[0]);

      try {
        const release = await createReleaseWithActions(
          'all_or_nothing',
          documentIds.map((documentId) => ({ documentId }))
        );

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(500);

        const found = await getRelease(release.id);
        expect(found.status).toBe('failed');
        for (const documentId of documentIds) {
          expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
        }
      } finally {
        documentIdsFailingToPublish.delete(documentIds[0]);
      }
    });

    test('a scheduled run of a release with no entries ends done', async () => {
      const release = (await createRelease()).body.data;

      await runScheduled(release.id);

      const found = await getRelease(release.id);
      expect(found.status).toBe('done');
      expect(found.releasedAt).not.toBeNull();
    });

    test('a manual publish of an allow_partial release with no entries ends done', async () => {
      const release = (await createRelease({ releaseCondition: 'allow_partial' })).body.data;

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('done');
    });

    describe('with a required review stage', () => {
      let workflow;

      const createReviewItem = async ({ approved }: { approved: boolean }): Promise<string> => {
        const { data } = await createEntry(reviewItemUID, { name: 'Review item' });

        if (approved) {
          const res = await rq({
            method: 'PUT',
            url: `/review-workflows/content-manager/collection-types/${reviewItemUID}/${data.documentId}/stage`,
            body: { data: { id: workflow.stages[1].id } },
          });
          expect(res.statusCode).toBe(200);
        }

        return data.documentId;
      };

      beforeAll(async () => {
        const res = await rq({
          method: 'POST',
          url: '/review-workflows/workflows?populate=*',
          body: {
            data: {
              name: `release-stage-${Math.random().toString(36)}`,
              contentTypes: [reviewItemUID],
              stages: [{ name: 'Review' }, { name: 'Done' }],
              stageRequiredToPublishName: 'Done',
            },
          },
        });
        expect(res.statusCode).toBe(201);
        workflow = res.body.data;
      });

      afterAll(async () => {
        await rq({ method: 'DELETE', url: `/review-workflows/workflows/${workflow.id}` });
      });

      test('allow_partial publishes the entry at the required stage and skips the other', async () => {
        const approvedId = await createReviewItem({ approved: true });
        const notApprovedId = await createReviewItem({ approved: false });
        const release = await createReleaseWithActions('allow_partial', [
          { documentId: notApprovedId, contentType: reviewItemUID },
          { documentId: approvedId, contentType: reviewItemUID },
        ]);

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('partial');
        expect(await hasPublishedVersion(reviewItemUID, approvedId)).toBe(true);
        expect(await hasPublishedVersion(reviewItemUID, notApprovedId)).toBe(false);
      });

      test('all_or_nothing manual publish is rejected with the stage error and stays blocked', async () => {
        const approvedId = await createReviewItem({ approved: true });
        const notApprovedId = await createReviewItem({ approved: false });
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: approvedId, contentType: reviewItemUID },
          { documentId: notApprovedId, contentType: reviewItemUID },
        ]);

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(400);
        expect(res.body.error.message).toBe('Entry is not at the required stage to publish');

        const found = await getRelease(release.id);
        expect(found.status).toBe('blocked');
        expect(await hasPublishedVersion(reviewItemUID, approvedId)).toBe(false);
        expect(await hasPublishedVersion(reviewItemUID, notApprovedId)).toBe(false);
      });
    });

    describe('with a unique field', () => {
      // Published with this slug, then its draft edited: both versions hold the slug
      const createPublishedSlugItemWithEditedDraft = async (slug: string): Promise<string> => {
        const { data } = await createEntry(slugItemUID, { title: 'Published', slug });
        await strapi.documents(slugItemUID).publish({ documentId: data.documentId });
        await strapi
          .documents(slugItemUID)
          .update({ documentId: data.documentId, data: { title: 'Edited' } });

        return data.documentId;
      };

      test('an entry whose published version holds its slug is publishable', async () => {
        const documentId = await createPublishedSlugItemWithEditedDraft('published-and-edited');
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId, contentType: slugItemUID },
        ]);

        expect((await getRelease(release.id)).status).toBe('ready');

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('done');
        const published = await strapi
          .documents(slugItemUID)
          .findOne({ documentId, status: 'published' });
        expect(published.title).toBe('Edited');
      });

      test('an entry whose slug another published entry holds is not publishable', async () => {
        await createPublishedSlugItemWithEditedDraft('taken');
        const { data } = await createEntry(slugItemUID, { title: 'Draft', slug: 'taken' });
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: data.documentId, contentType: slugItemUID },
        ]);

        expect((await getRelease(release.id)).status).toBe('blocked');

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(400);
        expect(res.body.error.message).toBe('This attribute must be unique');
        expect(await hasPublishedVersion(slugItemUID, data.documentId)).toBe(false);
      });
    });
  });

  describe('Find Many Releases', () => {
    test('Find many not published releases', async () => {
      await createRelease();
      await createRelease();

      const res = await rq({
        method: 'GET',
        url: '/content-releases?filters[releasedAt][$notNull]=false',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.pendingReleasesCount).toBe(2);
    });

    test('Find many releases with an entry attached', async () => {
      const createFirstReleaseRes = await createRelease();
      const release = createFirstReleaseRes.body.data;
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: validEntries[3].data.documentId,
        type: 'publish',
      });

      const res = await rq({
        method: 'GET',
        url: `/content-releases/getByDocumentAttached?contentType=${productUID}&entryDocumentId=${validEntries[3].data.documentId}&hasEntryAttached=true`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe(release.name);
    });

    test('Find many releases without an entry attached', async () => {
      const createFirstReleaseRes = await createRelease();
      const release = createFirstReleaseRes.body.data;

      const res = await rq({
        method: 'GET',
        url: `/content-releases/getByDocumentAttached?contentType=${productUID}&entryDocumentId=${validEntries[4]}&hasEntryAttached=false`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe(release.name);
    });
  });

  describe('Delete Release', () => {
    test('Delete a release', async () => {
      const createFirstReleaseRes = await createRelease();
      const release = createFirstReleaseRes.body.data;

      const res = await rq({
        method: 'DELETE',
        url: `/content-releases/${release.id}`,
      });

      expect(res.statusCode).toBe(200);
    });

    test('cannot delete a release that does not exist', async () => {
      const res = await rq({
        method: 'DELETE',
        url: '/content-releases/999',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe('No release found for id 999');
    });
  });
});
