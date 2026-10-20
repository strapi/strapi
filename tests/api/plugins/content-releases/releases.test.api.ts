'use strict';

import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { parse } from 'dotenv';

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

// The test app's database, as the server reads it at startup
const databaseClient =
  process.env.DATABASE_CLIENT ??
  parse(readFileSync(process.env.ENV_PATH as string)).DATABASE_CLIENT;

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
    // Checked at publish only: drafts skip unique and minimum length checks
    sku: {
      type: 'string',
      unique: true,
    },
    code: {
      type: 'string',
      minLength: 3,
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
    // Checked at publish only: a draft can hold a code too short to publish
    code: { type: 'string', minLength: 3 },
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
// What a release action stores: the message without the value it ends with
const INVALID_PRODUCT_RECORDED_MESSAGE = 'description must be a `string` type';

describeOnCondition(edition === 'EE')('Content Releases API', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let rqContent;
  let validEntries = [];
  let invalidEntries = [];
  // Publishing one of these documents throws, through a test-only document middleware
  const documentIdsFailingToPublish = new Set<string>();
  // Publishing one of these documents runs a query that fails in the database, inside the run's
  // transaction: Postgres aborts the transaction, SQLite and MySQL only fail the statement
  const documentIdsFailingInDatabase = new Set<string>();
  // Publishing one of these documents waits for its pause first, through the same middleware
  const publishPauses = new Map<string, () => Promise<void>>();
  // The next release-action query of this kind fails in the database
  const failNextActionQuery: { kind: 'findMany' | 'updateMany' | 'count' | null } = { kind: null };
  let unsubscribeFailingActionQueries: () => void;

  const failInDatabase = async () => {
    if (!strapi.db.inTransaction()) {
      throw new Error('failInDatabase is meant to run inside a transaction');
    }

    const { get } = await strapi.db.transaction();
    await strapi.db.connection.raw('SELECT * FROM table_that_does_not_exist').transacting(get());
  };

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

  // A release with one publish action, on the first valid product
  const createReleaseWithPublishAction = async () => {
    const release = (await createRelease()).body.data;
    const { documentId } = validEntries[0].data;
    const releaseAction = (
      await createReleaseAction(release.id, {
        contentType: productUID,
        entryDocumentId: documentId,
        type: 'publish',
      })
    ).body.data;

    return { release, documentId, releaseAction };
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

  // The release's actions as the admin reads them, by entry
  const getActionsByEntry = async (releaseId) => {
    const res = await rq({
      method: 'GET',
      url: `/content-releases/${releaseId}/actions`,
      qs: { pageSize: 100 },
    });
    expect(res.statusCode).toBe(200);

    return Object.fromEntries(
      Object.values(res.body.data)
        .flat()
        .map((action: { entryDocumentId: string }) => [action.entryDocumentId, action])
    );
  };

  // Some release-action changes land in the background (e.g. after an entry edit): poll for them
  const waitFor = async (check: () => Promise<boolean>) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (await check()) {
        return true;
      }

      await sleep(100);
    }

    return false;
  };

  // The release status update counts the release's actions: that count fails during `request`
  const withFailingStatusUpdate = async <T>(request: () => Promise<T>) => {
    failNextActionQuery.kind = 'count';
    try {
      return await request();
    } finally {
      failNextActionQuery.kind = null;
    }
  };

  beforeAll(async () => {
    await builder
      .addContentType(productModel)
      .addContentTypes([categoryModel, articleModel, pageModel, reviewItemModel, slugItemModel])
      .build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    rqContent = createContentAPIRequest({ strapi });

    strapi.documents.use(async (ctx, next) => {
      if (ctx.action === 'publish') {
        await publishPauses.get(ctx.params?.documentId)?.();
      }

      if (ctx.action === 'publish' && documentIdsFailingToPublish.has(ctx.params?.documentId)) {
        throw new Error('Test-only publish failure');
      }

      if (ctx.action === 'publish' && documentIdsFailingInDatabase.has(ctx.params?.documentId)) {
        await failInDatabase();
      }

      return next();
    });

    const failIfArmed = async (kind: NonNullable<(typeof failNextActionQuery)['kind']>) => {
      if (failNextActionQuery.kind !== kind) {
        return;
      }

      failNextActionQuery.kind = null;
      await failInDatabase();
    };
    unsubscribeFailingActionQueries = strapi.db.lifecycles.subscribe({
      models: ['plugin::content-releases.release-action'],
      beforeFindMany: () => failIfArmed('findMany'),
      beforeUpdateMany: () => failIfArmed('updateMany'),
      beforeCount: () => failIfArmed('count'),
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
    unsubscribeFailingActionQueries?.();

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

    test('an action whose release status update fails is not added', async () => {
      const release = (await createRelease()).body.data;
      const action = {
        contentType: productUID,
        entryDocumentId: validEntries[0].data.documentId,
        type: 'publish',
      };

      const failedRes = await withFailingStatusUpdate(() =>
        createReleaseAction(release.id, action)
      );
      expect(failedRes.statusCode).toBe(500);

      expect(await getActionsByEntry(release.id)).toEqual({});
      expect((await createReleaseAction(release.id, action)).statusCode).toBe(201);
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

    test('actions whose release status update fails are not added', async () => {
      const release = (await createRelease()).body.data;

      const failedRes = await withFailingStatusUpdate(() =>
        rq({
          method: 'POST',
          url: `/content-releases/${release.id}/actions/bulk`,
          body: [0, 1].map((index) => ({
            entryDocumentId: validEntries[index].data.documentId,
            contentType: productUID,
            type: 'publish',
          })),
        })
      );

      expect(failedRes.statusCode).toBe(500);
      expect(await getActionsByEntry(release.id)).toEqual({});
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

    test('a type change whose release status update fails is not kept', async () => {
      const { release, documentId, releaseAction } = await createReleaseWithPublishAction();

      const failedRes = await withFailingStatusUpdate(() =>
        rq({
          method: 'PUT',
          url: `/content-releases/${release.id}/actions/${releaseAction.id}`,
          body: { type: 'unpublish' },
        })
      );

      expect(failedRes.statusCode).toBe(500);
      expect((await getActionsByEntry(release.id))[documentId].type).toBe('publish');
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

    test('an action whose release status update fails on removal is kept', async () => {
      const { release, documentId, releaseAction } = await createReleaseWithPublishAction();

      const failedRes = await withFailingStatusUpdate(() =>
        rq({ method: 'DELETE', url: `/content-releases/${release.id}/actions/${releaseAction.id}` })
      );

      expect(failedRes.statusCode).toBe(500);
      expect((await getActionsByEntry(release.id))[documentId]).toMatchObject({
        id: releaseAction.id,
      });
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
        `Action with id 1 not found in release with id ${release.id}`
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

    test('an unpublish entry whose draft became invalid does not block the release', async () => {
      const toUnpublishId = await createProduct({ valid: true });
      await strapi.documents(productUID).publish({ documentId: toUnpublishId });
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: await createProduct({ valid: true }) },
        { documentId: toUnpublishId, type: 'unpublish' },
      ]);

      await strapi
        .documents(productUID)
        .update({ documentId: toUnpublishId, data: { description: null } });
      // Edits no longer mark unpublish actions invalid; earlier versions did, so such rows exist
      await strapi.db.query('plugin::content-releases.release-action').updateMany({
        where: { release: { id: release.id }, entryDocumentId: toUnpublishId },
        data: { isEntryValid: false },
      });
      await strapi.plugin('content-releases').service('release').updateReleaseStatus(release.id);

      expect((await getRelease(release.id)).status).toBe('ready');

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('done');
      expect(await hasPublishedVersion(productUID, toUnpublishId)).toBe(false);
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
        expect(res.body.meta).toEqual({
          totalEntries: 10,
          totalPublishedEntries: 7,
          totalUnpublishedEntries: 0,
          totalSkippedEntries: 3,
        });

        const found = await getRelease(release.id);
        expect(found.status).toBe('partial');
        expect(found.releasedAt).not.toBeNull();
        expect(found).toMatchObject({
          totalPublishedEntries: 7,
          totalUnpublishedEntries: 0,
          totalSkippedEntries: 3,
        });

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
      expect(res.body.meta).toEqual({
        totalEntries: 3,
        totalPublishedEntries: 0,
        totalUnpublishedEntries: 1,
        totalSkippedEntries: 2,
      });
      expect(await hasPublishedVersion(productUID, publishedId)).toBe(false);
    });

    test('allow_partial where every entry is released ends done', async () => {
      const toPublishId = await createProduct({ valid: true });
      const toUnpublishId = await createProduct({ valid: true });
      await strapi.documents(productUID).publish({ documentId: toUnpublishId });

      const release = await createReleaseWithActions('allow_partial', [
        { documentId: toPublishId },
        { documentId: toUnpublishId, type: 'unpublish' },
      ]);

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('done');
      expect(res.body.meta).toEqual({
        totalEntries: 2,
        totalPublishedEntries: 1,
        totalUnpublishedEntries: 1,
        totalSkippedEntries: 0,
      });

      const found = await getRelease(release.id);
      expect(found.status).toBe('done');
      expect(found.releasedAt).not.toBeNull();
      expect(await hasPublishedVersion(productUID, toPublishId)).toBe(true);
      expect(await hasPublishedVersion(productUID, toUnpublishId)).toBe(false);
    });

    const createProductWithTakenSku = async (): Promise<string> => {
      // Per test: a published value stays taken for the tests after it
      const sku = `sku-${Math.random().toString(36).slice(2)}`;
      const { data: holder } = await createEntry(productUID, {
        name: 'Holds the sku',
        description: 'Description',
        sku,
      });
      await strapi.documents(productUID).publish({ documentId: holder.documentId });
      const { data } = await createEntry(productUID, {
        name: 'Same sku',
        description: 'Description',
        sku,
      });

      return data.documentId;
    };

    const createProductWithShortCode = async (): Promise<string> => {
      const { data } = await createEntry(productUID, {
        name: 'Short code',
        description: 'Description',
        code: 'ab',
      });

      return data.documentId;
    };

    test.each([
      ['a unique value another published entry holds', createProductWithTakenSku],
      ['a value shorter than its minimum length', createProductWithShortCode],
    ])(
      'allow_partial skips an entry with %s and publishes the others',
      async (_, createSkipped) => {
        const validId = await createProduct({ valid: true });
        const skippedId = await createSkipped();
        const release = await createReleaseWithActions('allow_partial', [
          { documentId: skippedId },
          { documentId: validId },
        ]);

        expect((await getRelease(release.id)).status).toBe('ready');

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('partial');
        expect(await hasPublishedVersion(productUID, validId)).toBe(true);
        expect(await hasPublishedVersion(productUID, skippedId)).toBe(false);
      }
    );

    test('allow_partial skips an entry that no longer exists', async () => {
      const validId = await createProduct({ valid: true });
      const vanishedId = await createProduct({ valid: true });
      const release = await createReleaseWithActions('allow_partial', [
        { documentId: vanishedId },
        { documentId: validId },
      ]);

      // Removed without the hooks that take a deleted entry out of its releases, so its action
      // stays and points at nothing
      await strapi.db.query(productUID).delete({ where: { documentId: vanishedId } });

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('partial');
      expect(await hasPublishedVersion(productUID, validId)).toBe(true);
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
      expect(found).toMatchObject({
        totalPublishedEntries: null,
        totalUnpublishedEntries: null,
        totalSkippedEntries: null,
      });
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
      expect(found.releasedAt).not.toBeNull();
      expect(found).toMatchObject({
        totalPublishedEntries: 0,
        totalUnpublishedEntries: 0,
        totalSkippedEntries: 2,
      });
      for (const documentId of invalidIds) {
        expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
      }
    });

    test('allow_partial where every entry fails at publish ends failed, with every entry skipped', async () => {
      const failingIds = [
        await createProduct({ valid: true }),
        await createProduct({ valid: true }),
      ];
      failingIds.forEach((documentId) => documentIdsFailingToPublish.add(documentId));

      try {
        const release = await createReleaseWithActions(
          'allow_partial',
          failingIds.map((documentId) => ({ documentId }))
        );

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(400);
        expect(res.body.error.message).toBe('No entries were published');

        const found = await getRelease(release.id);
        expect(found.status).toBe('failed');
        expect(found.releasedAt).not.toBeNull();
        expect(found).toMatchObject({
          totalPublishedEntries: 0,
          totalUnpublishedEntries: 0,
          totalSkippedEntries: 2,
        });
      } finally {
        failingIds.forEach((documentId) => documentIdsFailingToPublish.delete(documentId));
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
      expect(found.releasedAt).not.toBeNull();
      expect(found).toMatchObject({
        totalPublishedEntries: 0,
        totalUnpublishedEntries: 0,
        totalSkippedEntries: 2,
      });
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

    test('all_or_nothing run stopped by an error rolls back what went out and ends failed', async () => {
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
        expect(found.status).toBe('failed');
        expect(found.releasedAt).not.toBeNull();
        expect(found).toMatchObject({
          totalPublishedEntries: 0,
          totalUnpublishedEntries: 0,
          totalSkippedEntries: 5,
        });

        // The two entries published before the error are rolled back with the run
        for (const documentId of documentIds) {
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
        expect(found.releasedAt).not.toBeNull();
        for (const documentId of documentIds) {
          expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
        }
      } finally {
        documentIdsFailingToPublish.delete(documentIds[0]);
      }
    });

    // A database error is rolled back with its savepoint, so the outcome is the same on every
    // database: on Postgres, it would otherwise abort the whole transaction
    test('allow_partial run with a database error skips the entry and keeps the others', async () => {
      const publishedId = await createProduct({ valid: true });
      const failingId = await createProduct({ valid: true });
      documentIdsFailingInDatabase.add(failingId);
      const onPublishEvent = jest.fn();
      const stopListening = strapi.eventHub.on('releases.publish', onPublishEvent);

      try {
        const release = await createReleaseWithActions('allow_partial', [
          { documentId: publishedId },
          { documentId: failingId },
        ]);

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('partial');
        expect(await hasPublishedVersion(productUID, publishedId)).toBe(true);
        expect(await hasPublishedVersion(productUID, failingId)).toBe(false);
        expect(onPublishEvent).toHaveBeenCalledTimes(1);
        expect(onPublishEvent.mock.calls[0][0]).toMatchObject({
          isPublished: true,
          release: {
            id: release.id,
            status: 'partial',
            totalPublishedEntries: 1,
            totalUnpublishedEntries: 0,
            totalSkippedEntries: 1,
          },
        });
      } finally {
        stopListening();
        documentIdsFailingInDatabase.delete(failingId);
      }
    });

    test('all_or_nothing run with a database error publishes nothing and ends failed', async () => {
      const publishedFirstId = await createProduct({ valid: true });
      const failingId = await createProduct({ valid: true });
      documentIdsFailingInDatabase.add(failingId);
      const onPublishEvent = jest.fn();
      const stopListening = strapi.eventHub.on('releases.publish', onPublishEvent);

      try {
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: publishedFirstId },
          { documentId: failingId },
        ]);

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(500);
        const found = await getRelease(release.id);
        expect(found.status).toBe('failed');
        expect(found.releasedAt).not.toBeNull();
        expect(await hasPublishedVersion(productUID, publishedFirstId)).toBe(false);
        expect(onPublishEvent).toHaveBeenCalledTimes(1);
        expect(onPublishEvent.mock.calls[0][0]).toMatchObject({
          isPublished: false,
          release: {
            id: release.id,
            status: 'failed',
            totalPublishedEntries: 0,
            totalUnpublishedEntries: 0,
            totalSkippedEntries: 2,
          },
        });
      } finally {
        stopListening();
        documentIdsFailingInDatabase.delete(failingId);
      }
    });

    describe('a database error outside the entries rolls the whole run back', () => {
      const publishWithFailure = async (
        releaseId,
        kind: 'findMany' | 'updateMany'
      ): Promise<{ statusCode: number; publishEvents: unknown[] }> => {
        const onPublishEvent = jest.fn();
        const stopListening = strapi.eventHub.on('releases.publish', onPublishEvent);
        failNextActionQuery.kind = kind;

        try {
          const res = await publishManually(releaseId);

          return { statusCode: res.statusCode, publishEvents: onPublishEvent.mock.calls };
        } finally {
          failNextActionQuery.kind = null;
          stopListening();
        }
      };

      test('reading the entries fails: the release stays planned', async () => {
        const ids = [await createProduct({ valid: true }), await createProduct({ valid: true })];
        const release = await createReleaseWithActions(
          'all_or_nothing',
          ids.map((documentId) => ({ documentId }))
        );

        const { statusCode, publishEvents } = await publishWithFailure(release.id, 'findMany');

        expect(statusCode).toBe(500);
        expect(await getRelease(release.id)).toMatchObject({ status: 'ready', releasedAt: null });
        for (const documentId of ids) {
          expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
        }
        expect(publishEvents).toHaveLength(0);
      });

      test.each(['all_or_nothing', 'allow_partial'] as const)(
        '%s: writing the result fails after every entry went out: all of them are rolled back',
        async (releaseCondition) => {
          const ids = [await createProduct({ valid: true }), await createProduct({ valid: true })];
          const release = await createReleaseWithActions(
            releaseCondition,
            ids.map((documentId) => ({ documentId }))
          );

          const { statusCode, publishEvents } = await publishWithFailure(release.id, 'updateMany');

          expect(statusCode).toBe(500);
          expect(await getRelease(release.id)).toMatchObject({ status: 'ready', releasedAt: null });
          for (const documentId of ids) {
            expect(await hasPublishedVersion(productUID, documentId)).toBe(false);
          }
          expect((await getActionsByEntry(release.id))[ids[0]].outcome).toBeNull();
          expect(publishEvents).toHaveLength(0);
        }
      );

      test('a scheduled run stopped by the check whose Failed write fails rolls back too', async () => {
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: await createProduct({ valid: true }) },
          { documentId: await createProduct({ valid: false }) },
        ]);
        const onPublishEvent = jest.fn();
        const stopListening = strapi.eventHub.on('releases.publish', onPublishEvent);

        failNextActionQuery.kind = 'updateMany';

        try {
          await expect(runScheduled(release.id)).rejects.toThrow();
        } finally {
          failNextActionQuery.kind = null;
          stopListening();
        }

        expect(await getRelease(release.id)).toMatchObject({ status: 'blocked', releasedAt: null });
        expect(onPublishEvent).not.toHaveBeenCalled();
      });

      test('a manual publish rejected by the check whose write fails stays blocked', async () => {
        const validId = await createProduct({ valid: true });
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: validId },
          { documentId: await createProduct({ valid: false }) },
        ]);
        expect((await getRelease(release.id)).status).toBe('blocked');

        const { statusCode, publishEvents } = await publishWithFailure(release.id, 'updateMany');

        expect(statusCode).toBe(500);
        expect(await getRelease(release.id)).toMatchObject({ status: 'blocked', releasedAt: null });
        expect(await hasPublishedVersion(productUID, validId)).toBe(false);
        expect(publishEvents).toHaveLength(0);
      });
    });

    describe('a release frozen as failed', () => {
      const createFailedRelease = async () => {
        const invalidId = await createProduct({ valid: false });
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: await createProduct({ valid: true }) },
          { documentId: invalidId },
        ]);
        await expect(runScheduled(release.id)).rejects.toThrow(INVALID_PRODUCT_MESSAGE);

        return { release, invalidId };
      };

      test('leaves Pending', async () => {
        const { release } = await createFailedRelease();

        const res = await rq({
          method: 'GET',
          url: '/content-releases?filters[releasedAt][$notNull]=false',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.map(({ id }) => id)).not.toContain(release.id);
        expect(res.body.meta.pendingReleasesCount).toBe(0);
      });

      test('keeps its status when an entry gets fixed, and cannot be published again', async () => {
        const { release, invalidId } = await createFailedRelease();
        const plannedRelease = await createReleaseWithActions('all_or_nothing', [
          { documentId: invalidId },
        ]);

        const fixRes = await rq({
          method: 'PUT',
          url: `/content-manager/collection-types/${productUID}/${invalidId}`,
          body: { name: 'Fixed product', description: 'Description' },
        });
        expect(fixRes.statusCode).toBe(200);

        expect(
          await waitFor(
            async () => (await getActionsByEntry(plannedRelease.id))[invalidId].isEntryValid
          )
        ).toBe(true);

        await strapi.plugin('content-releases').service('release').updateReleaseStatus(release.id);

        expect((await getRelease(release.id)).status).toBe('failed');
        expect((await getActionsByEntry(release.id))[invalidId]).toMatchObject({
          outcome: 'skipped_invalid',
          isEntryValid: false,
        });

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(400);
        expect(res.body.error.message).toBe('Release already published');
      });

      test('cannot be edited or deleted', async () => {
        const { release } = await createFailedRelease();

        const updateRes = await rq({
          method: 'PUT',
          url: `/content-releases/${release.id}`,
          body: { name: 'Renamed' },
        });
        expect(updateRes.statusCode).toBe(400);
        expect(updateRes.body.error.message).toBe('Release already published');

        const deleteRes = await rq({ method: 'DELETE', url: `/content-releases/${release.id}` });
        expect(deleteRes.statusCode).toBe(400);
        expect(deleteRes.body.error.message).toBe('Release already published');
      });

      test('cannot gain, lose or change entries', async () => {
        const { release, invalidId } = await createFailedRelease();
        const { id: actionId } = (await getActionsByEntry(release.id))[invalidId];
        const newEntry = {
          contentType: productUID,
          entryDocumentId: await createProduct({ valid: true }),
          type: 'publish',
        };

        const responses = [
          await createReleaseAction(release.id, newEntry),
          await rq({
            method: 'POST',
            url: `/content-releases/${release.id}/actions/bulk`,
            body: [newEntry],
          }),
          await rq({
            method: 'PUT',
            url: `/content-releases/${release.id}/actions/${actionId}`,
            body: { type: 'unpublish' },
          }),
          await rq({
            method: 'DELETE',
            url: `/content-releases/${release.id}/actions/${actionId}`,
          }),
        ];

        for (const res of responses) {
          expect(res.statusCode).toBe(400);
          expect(res.body.error.message).toBe('Release already published');
        }
        expect(Object.keys(await getActionsByEntry(release.id))).toHaveLength(2);
        expect((await getActionsByEntry(release.id))[invalidId]).toMatchObject({
          type: 'publish',
          outcome: 'skipped_invalid',
        });
      });
    });

    test('deleting an entry of a done release leaves it done, with its totals', async () => {
      const documentIds = [
        await createProduct({ valid: true }),
        await createProduct({ valid: true }),
      ];
      const release = await createReleaseWithActions(
        'all_or_nothing',
        documentIds.map((documentId) => ({ documentId }))
      );
      expect((await publishManually(release.id)).statusCode).toBe(200);

      const res = await rq({
        method: 'DELETE',
        url: `/content-manager/collection-types/${productUID}/${documentIds[0]}`,
      });
      expect(res.statusCode).toBe(200);

      await strapi.plugin('content-releases').service('release').updateReleaseStatus(release.id);

      expect(await getRelease(release.id)).toMatchObject({
        status: 'done',
        totalPublishedEntries: 2,
        totalUnpublishedEntries: 0,
        totalSkippedEntries: 0,
      });
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
      expect((await getRelease(release.id)).status).toBe('empty');

      const res = await publishManually(release.id);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('done');
      expect(res.body.meta).toEqual({
        totalEntries: 0,
        totalPublishedEntries: 0,
        totalUnpublishedEntries: 0,
        totalSkippedEntries: 0,
      });
    });

    describe('with a required review stage', () => {
      let workflow;

      const createReviewItem = async ({
        approved,
        code,
      }: {
        approved: boolean;
        code?: string;
      }): Promise<string> => {
        const { data } = await createEntry(reviewItemUID, { name: 'Review item', code });

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

      test('an entry not at the required stage is recorded as skipped_not_approved with its stage and the required one', async () => {
        const notApprovedId = await createReviewItem({ approved: false });
        const release = await createReleaseWithActions('allow_partial', [
          { documentId: notApprovedId, contentType: reviewItemUID },
          { documentId: await createReviewItem({ approved: true }), contentType: reviewItemUID },
        ]);

        expect((await publishManually(release.id)).statusCode).toBe(200);

        const actions = await getActionsByEntry(release.id);
        expect(actions[notApprovedId]).toMatchObject({
          outcome: 'skipped_not_approved',
          isEntryValid: false,
        });
        expect(actions[notApprovedId].reason).toEqual({
          stage: {
            entryStage: { id: workflow.stages[0].id, name: 'Review' },
            requiredStage: { id: workflow.stages[1].id, name: 'Done' },
          },
        });
      });

      test('an entry that is both invalid and not at the required stage is recorded as skipped_invalid, with both reasons', async () => {
        const failsBothId = await createReviewItem({ approved: false, code: 'ab' });
        const release = await createReleaseWithActions('allow_partial', [
          { documentId: failsBothId, contentType: reviewItemUID },
          { documentId: await createReviewItem({ approved: true }), contentType: reviewItemUID },
        ]);

        expect((await publishManually(release.id)).statusCode).toBe(200);

        const actions = await getActionsByEntry(release.id);
        expect(actions[failsBothId].outcome).toBe('skipped_invalid');
        expect(actions[failsBothId].reason).toEqual({
          validation: { errors: [{ path: ['code'], message: expect.any(String) }] },
          stage: {
            entryStage: { id: workflow.stages[0].id, name: 'Review' },
            requiredStage: { id: workflow.stages[1].id, name: 'Done' },
          },
        });
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

      // Both entries pass the check before the run: nothing published holds the contested slug
      // yet. The first one then publishes it, so the second one's publish, which removes its
      // published version before it validates the new one, fails the unique check.
      // Prefixed per test: a published slug stays taken for the tests after it.
      const createContestedSlugItems = async (prefix: string) => {
        const { data: first } = await createEntry(slugItemUID, {
          title: 'Never published',
          slug: `${prefix}-contested`,
        });
        const { data: second } = await createEntry(slugItemUID, {
          title: 'Published',
          slug: `${prefix}-original`,
        });
        await strapi.documents(slugItemUID).publish({ documentId: second.documentId });
        await strapi
          .documents(slugItemUID)
          .update({ documentId: second.documentId, data: { slug: `${prefix}-contested` } });

        return { firstId: first.documentId, secondId: second.documentId };
      };

      const getPublishedSlug = async (documentId: string) => {
        const published = await strapi
          .documents(slugItemUID)
          .findOne({ documentId, status: 'published' });

        return published?.slug ?? null;
      };

      test('allow_partial: an entry that fails the unique check at publish keeps its published version', async () => {
        const { firstId, secondId } = await createContestedSlugItems('partial');
        const release = await createReleaseWithActions('allow_partial', [
          { documentId: firstId, contentType: slugItemUID },
          { documentId: secondId, contentType: slugItemUID },
        ]);

        expect((await getRelease(release.id)).status).toBe('ready');

        const res = await publishManually(release.id);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('partial');
        expect(await getPublishedSlug(firstId)).toBe('partial-contested');
        // Still online, as it was before the run
        expect(await getPublishedSlug(secondId)).toBe('partial-original');
        expect((await getActionsByEntry(release.id))[secondId]).toMatchObject({
          outcome: 'skipped_invalid',
          reason: {
            validation: { errors: [{ path: ['slug'], message: 'This attribute must be unique' }] },
          },
        });
      });

      test('all_or_nothing: an entry that fails the unique check at publish rolls the whole run back', async () => {
        const { firstId, secondId } = await createContestedSlugItems('all-or-nothing');
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: firstId, contentType: slugItemUID },
          { documentId: secondId, contentType: slugItemUID },
        ]);
        const onEntryPublish = jest.fn();
        const stopListening = strapi.eventHub.on('entry.publish', onEntryPublish);

        try {
          const res = await publishManually(release.id);

          expect(res.statusCode).toBe(400);
          expect(res.body.error.message).toBe('This attribute must be unique');
          expect((await getRelease(release.id)).status).toBe('failed');
          expect(await getPublishedSlug(firstId)).toBeNull();
          expect(await getPublishedSlug(secondId)).toBe('all-or-nothing-original');
          // The rolled-back publish of the first entry announces nothing
          expect(onEntryPublish).not.toHaveBeenCalled();
          const actions = await getActionsByEntry(release.id);
          expect(actions[secondId]).toMatchObject({
            outcome: 'skipped_invalid',
            reason: {
              validation: {
                errors: [{ path: ['slug'], message: 'This attribute must be unique' }],
              },
            },
          });
          expect(actions[firstId]).toMatchObject({ outcome: 'skipped_held', reason: null });
        } finally {
          stopListening();
        }
      });
    });
  });

  describe('Entry outcomes', () => {
    test('an entry the run publishes is recorded as published', async () => {
      const documentId = await createProduct({ valid: true });
      const release = await createReleaseWithActions('all_or_nothing', [{ documentId }]);

      expect((await publishManually(release.id)).statusCode).toBe(200);

      const actions = await getActionsByEntry(release.id);
      expect(actions[documentId]).toMatchObject({ outcome: 'published', reason: null });
    });

    test('an unpublish entry is recorded as unpublished, even when it was not published', async () => {
      const publishedId = await createProduct({ valid: true });
      await strapi.documents(productUID).publish({ documentId: publishedId });
      const neverPublishedId = await createProduct({ valid: true });
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: publishedId, type: 'unpublish' },
        { documentId: neverPublishedId, type: 'unpublish' },
      ]);

      expect((await publishManually(release.id)).statusCode).toBe(200);

      const actions = await getActionsByEntry(release.id);
      expect(actions[publishedId]).toMatchObject({ outcome: 'unpublished', reason: null });
      expect(actions[neverPublishedId]).toMatchObject({ outcome: 'unpublished', reason: null });
    });

    test('a run stores the validity it found, replacing one that had gone out of date', async () => {
      const fixedId = await createProduct({ valid: true });
      const brokenId = await createProduct({ valid: true });
      const release = await createReleaseWithActions('allow_partial', [
        { documentId: fixedId },
        { documentId: brokenId },
      ]);

      // Changed through paths that don't revalidate the release actions
      await strapi.db.query('plugin::content-releases.release-action').updateMany({
        where: { release: { id: release.id }, entryDocumentId: fixedId },
        data: { isEntryValid: false },
      });
      await strapi.db.query(productUID).updateMany({
        where: { documentId: brokenId },
        data: { description: null },
      });

      expect((await publishManually(release.id)).statusCode).toBe(200);

      const actions = await getActionsByEntry(release.id);
      expect(actions[fixedId]).toMatchObject({ outcome: 'published', isEntryValid: true });
      expect(actions[brokenId]).toMatchObject({ outcome: 'skipped_invalid', isEntryValid: false });
    });

    test('an invalid entry is recorded as skipped_invalid with its field errors, without the submitted values', async () => {
      const invalidId = await createProduct({ valid: false });
      const release = await createReleaseWithActions('allow_partial', [
        { documentId: invalidId },
        { documentId: await createProduct({ valid: true }) },
      ]);

      expect((await publishManually(release.id)).statusCode).toBe(200);

      const actions = await getActionsByEntry(release.id);
      expect(actions[invalidId].outcome).toBe('skipped_invalid');
      expect(actions[invalidId].reason).toEqual({
        validation: {
          errors: [{ path: ['description'], message: INVALID_PRODUCT_RECORDED_MESSAGE }],
        },
      });
    });

    test('an allow_partial entry that errors at publish is recorded as skipped_error with only the error name', async () => {
      const failingId = await createProduct({ valid: true });
      documentIdsFailingToPublish.add(failingId);

      try {
        const release = await createReleaseWithActions('allow_partial', [
          { documentId: failingId },
          { documentId: await createProduct({ valid: true }) },
        ]);

        expect((await publishManually(release.id)).statusCode).toBe(200);

        const actions = await getActionsByEntry(release.id);
        // It had passed the check: only releasing it threw
        expect(actions[failingId]).toMatchObject({ outcome: 'skipped_error', isEntryValid: true });
        // The test middleware throws a plain Error; its message must not be kept
        expect(actions[failingId].reason).toEqual({ error: { name: 'Error' } });
      } finally {
        documentIdsFailingToPublish.delete(failingId);
      }
    });

    test('a scheduled all_or_nothing run held back by an invalid entry records it as skipped_invalid and the others as skipped_held', async () => {
      const validId = await createProduct({ valid: true });
      const invalidId = await createProduct({ valid: false });
      const toUnpublishId = await createProduct({ valid: true });
      await strapi.documents(productUID).publish({ documentId: toUnpublishId });
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: validId },
        { documentId: invalidId },
        { documentId: toUnpublishId, type: 'unpublish' },
      ]);

      await expect(runScheduled(release.id)).rejects.toThrow(INVALID_PRODUCT_MESSAGE);

      const actions = await getActionsByEntry(release.id);
      expect(actions[invalidId].outcome).toBe('skipped_invalid');
      expect(actions[validId]).toMatchObject({
        outcome: 'skipped_held',
        isEntryValid: true,
        reason: null,
      });
      expect(actions[toUnpublishId]).toMatchObject({
        outcome: 'skipped_held',
        isEntryValid: true,
        reason: null,
      });
    });

    test('an all_or_nothing run stopped by an error records the failing entry as skipped_error and the others as skipped_held', async () => {
      const documentIds = [
        await createProduct({ valid: true }),
        await createProduct({ valid: true }),
        await createProduct({ valid: true }),
      ];
      const [releasedBeforeId, failingId, notReachedId] = documentIds;
      documentIdsFailingToPublish.add(failingId);

      try {
        const release = await createReleaseWithActions(
          'all_or_nothing',
          documentIds.map((documentId) => ({ documentId }))
        );

        expect((await publishManually(release.id)).statusCode).toBe(500);

        const actions = await getActionsByEntry(release.id);
        expect(actions[failingId]).toMatchObject({
          outcome: 'skipped_error',
          reason: { error: { name: 'Error' } },
        });
        // Rolled back with the run, so held back like the entry the run never reached
        expect(actions[releasedBeforeId]).toMatchObject({ outcome: 'skipped_held', reason: null });
        expect(actions[notReachedId]).toMatchObject({ outcome: 'skipped_held', reason: null });
      } finally {
        documentIdsFailingToPublish.delete(failingId);
      }
    });

    test('a scheduled allow_partial run with no publishable entry records each entry with its own skip reason', async () => {
      const invalidIds = [
        await createProduct({ valid: false }),
        await createProduct({ valid: false }),
      ];
      const release = await createReleaseWithActions(
        'allow_partial',
        invalidIds.map((documentId) => ({ documentId }))
      );

      await expect(runScheduled(release.id)).rejects.toThrow('No entries were published');

      const actions = await getActionsByEntry(release.id);
      for (const documentId of invalidIds) {
        expect(actions[documentId]).toMatchObject({
          outcome: 'skipped_invalid',
          reason: {
            validation: {
              errors: [{ path: ['description'], message: INVALID_PRODUCT_RECORDED_MESSAGE }],
            },
          },
        });
      }
    });

    test('a rejected manual publish records no outcome: the release did not run', async () => {
      const validId = await createProduct({ valid: true });
      const invalidId = await createProduct({ valid: false });
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: validId },
        { documentId: invalidId },
      ]);

      expect((await publishManually(release.id)).statusCode).toBe(400);

      const actions = await getActionsByEntry(release.id);
      expect(actions[validId]).toMatchObject({ outcome: null, reason: null });
      expect(actions[invalidId]).toMatchObject({
        outcome: null,
        isEntryValid: false,
        reason: { validation: expect.any(Object) },
      });
    });

    test('fixing a skipped entry after the run leaves what the run recorded unchanged', async () => {
      const skippedId = await createProduct({ valid: false });
      const ranRelease = await createReleaseWithActions('allow_partial', [
        { documentId: skippedId },
        { documentId: await createProduct({ valid: true }) },
      ]);
      expect((await publishManually(ranRelease.id)).statusCode).toBe(200);
      // A planned release with the same entry shows when the fix has been taken into account
      const plannedRelease = await createReleaseWithActions('allow_partial', [
        { documentId: skippedId },
      ]);
      const recorded = (await getActionsByEntry(ranRelease.id))[skippedId];

      const fixRes = await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/${productUID}/${skippedId}`,
        body: { description: 'Fixed' },
      });
      expect(fixRes.statusCode).toBe(200);

      // The update revalidates release actions without awaiting it
      expect(
        await waitFor(
          async () => (await getActionsByEntry(plannedRelease.id))[skippedId].isEntryValid
        )
      ).toBe(true);

      const after = (await getActionsByEntry(ranRelease.id))[skippedId];
      expect({
        isEntryValid: after.isEntryValid,
        outcome: after.outcome,
        reason: after.reason,
      }).toEqual({
        isEntryValid: false,
        outcome: 'skipped_invalid',
        reason: recorded.reason,
      });
    });

    test('deleting an entry keeps its action in a release that ran, with what the run recorded', async () => {
      const deletedId = await createProduct({ valid: false });
      const ranRelease = await createReleaseWithActions('allow_partial', [
        { documentId: deletedId },
        { documentId: await createProduct({ valid: true }) },
      ]);
      expect((await publishManually(ranRelease.id)).statusCode).toBe(200);
      // A planned release with the same entry shows when the deletion has been taken into account
      const plannedRelease = await createReleaseWithActions('allow_partial', [
        { documentId: deletedId },
      ]);
      const recorded = (await getActionsByEntry(ranRelease.id))[deletedId];

      // All locales: deleting a single locale of a non-localized entry keeps its actions (EE-254)
      await strapi.documents(productUID).delete({ documentId: deletedId, locale: '*' });

      // The deletion removes release actions without awaiting it
      expect(
        await waitFor(
          async () => (await getActionsByEntry(plannedRelease.id))[deletedId] === undefined
        )
      ).toBe(true);

      const kept = (await getActionsByEntry(ranRelease.id))[deletedId];
      expect(kept).toMatchObject({
        outcome: 'skipped_invalid',
        reason: recorded.reason,
        entry: {},
        status: null,
      });
      expect((await getRelease(ranRelease.id)).status).toBe('partial');
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

    test('lists each release with what its run did, and empty totals for a planned one', async () => {
      const ranRelease = await createReleaseWithActions('allow_partial', [
        { documentId: await createProduct({ valid: true }) },
        { documentId: await createProduct({ valid: false }) },
      ]);
      expect((await publishManually(ranRelease.id)).statusCode).toBe(200);
      const plannedRelease = await createReleaseWithActions('allow_partial', [
        { documentId: await createProduct({ valid: true }) },
      ]);

      // Released releases from earlier tests stay listed: only read this one from the done tab
      const [doneRes, pendingRes] = await Promise.all([
        rq({
          method: 'GET',
          url: '/content-releases',
          qs: { filters: { id: ranRelease.id, releasedAt: { $notNull: true } } },
        }),
        rq({ method: 'GET', url: '/content-releases?filters[releasedAt][$notNull]=false' }),
      ]);

      expect(doneRes.statusCode).toBe(200);
      expect(doneRes.body.data).toEqual([
        expect.objectContaining({
          id: ranRelease.id,
          totalPublishedEntries: 1,
          totalUnpublishedEntries: 0,
          totalSkippedEntries: 1,
        }),
      ]);
      expect(pendingRes.statusCode).toBe(200);
      expect(pendingRes.body.data).toEqual([
        expect.objectContaining({
          id: plannedRelease.id,
          totalPublishedEntries: null,
          totalUnpublishedEntries: null,
          totalSkippedEntries: null,
        }),
      ]);
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
  describe('Planned entries: why an entry is not publishable', () => {
    const getAction = async (releaseId, documentId) =>
      (await getActionsByEntry(releaseId))[documentId];

    const fixProduct = (documentId) =>
      rq({
        method: 'PUT',
        url: `/content-manager/collection-types/${productUID}/${documentId}`,
        body: { name: 'Fixed product', description: 'Description' },
      });

    test('an invalid entry stores its field errors, without the submitted value, until it is fixed', async () => {
      const invalidId = await createProduct({ valid: false });
      const release = await createReleaseWithActions('all_or_nothing', [{ documentId: invalidId }]);

      expect(await getAction(release.id, invalidId)).toMatchObject({
        isEntryValid: false,
        reason: {
          validation: {
            errors: [{ path: ['description'], message: INVALID_PRODUCT_RECORDED_MESSAGE }],
          },
        },
      });
      const found = await getRelease(release.id);
      expect(found.status).toBe('blocked');
      expect(found.actions.meta).toEqual({ count: 1, notReadyCount: 1 });

      expect((await fixProduct(invalidId)).statusCode).toBe(200);

      expect(
        await waitFor(async () => (await getAction(release.id, invalidId)).isEntryValid === true)
      ).toBe(true);
      expect((await getAction(release.id, invalidId)).reason).toBeNull();
      expect(await waitFor(async () => (await getRelease(release.id)).status === 'ready')).toBe(
        true
      );
      expect((await getRelease(release.id)).actions.meta).toEqual({ count: 1, notReadyCount: 0 });
    });

    describe('when a draft is discarded', () => {
      // A published product, in a planned all_or_nothing release
      const createPublishedProductInRelease = async () => {
        const documentId = await createProduct({ valid: true });
        await strapi.documents(productUID).publish({ documentId });
        const release = await createReleaseWithActions('all_or_nothing', [{ documentId }]);

        return { documentId, release };
      };

      test('an invalid draft replaced by its valid published version makes the action valid', async () => {
        const { documentId, release } = await createPublishedProductInRelease();
        await strapi.documents(productUID).update({ documentId, data: { description: null } });
        expect(await waitFor(async () => (await getRelease(release.id)).status === 'blocked')).toBe(
          true
        );

        await strapi.documents(productUID).discardDraft({ documentId });

        expect(
          await waitFor(async () => (await getAction(release.id, documentId)).isEntryValid === true)
        ).toBe(true);
        expect((await getAction(release.id, documentId)).reason).toBeNull();
        expect(await waitFor(async () => (await getRelease(release.id)).status === 'ready')).toBe(
          true
        );
      });

      test('a valid draft replaced by an invalid published version stores the reason', async () => {
        const { documentId, release } = await createPublishedProductInRelease();
        // Publishing validates, so make the published version invalid behind its back
        await strapi.db.query(productUID).updateMany({
          where: { documentId, publishedAt: { $notNull: true } },
          data: { description: null },
        });
        expect((await getRelease(release.id)).status).toBe('ready');

        await strapi.documents(productUID).discardDraft({ documentId });

        expect(
          await waitFor(
            async () => (await getAction(release.id, documentId)).isEntryValid === false
          )
        ).toBe(true);
        expect((await getAction(release.id, documentId)).reason).toEqual({
          validation: {
            errors: [{ path: ['description'], message: INVALID_PRODUCT_RECORDED_MESSAGE }],
          },
        });
        expect(await waitFor(async () => (await getRelease(release.id)).status === 'blocked')).toBe(
          true
        );
      });

      test('an unpublish action stays publishable, whatever the published version', async () => {
        const documentId = await createProduct({ valid: true });
        await strapi.documents(productUID).publish({ documentId });
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId, type: 'unpublish' },
        ]);
        // As stored by an earlier version, which validated unpublish actions too
        await strapi.db.query('plugin::content-releases.release-action').updateMany({
          where: { release: release.id },
          data: { isEntryValid: false },
        });
        // An invalid published version replaces the draft
        await strapi.db.query(productUID).updateMany({
          where: { documentId, publishedAt: { $notNull: true } },
          data: { description: null },
        });

        await strapi.documents(productUID).discardDraft({ documentId });

        expect(
          await waitFor(async () => (await getAction(release.id, documentId)).isEntryValid === true)
        ).toBe(true);
        expect((await getAction(release.id, documentId)).reason).toBeNull();
        expect((await getRelease(release.id)).status).toBe('ready');
      });
    });

    test('an unpublish action has no reason and never counts as not ready', async () => {
      const invalidId = await createProduct({ valid: false });
      const unpublishRelease = await createReleaseWithActions('all_or_nothing', [
        { documentId: invalidId, type: 'unpublish' },
      ]);

      const publishRelease = await createReleaseWithActions('all_or_nothing', [
        { documentId: invalidId },
      ]);

      expect(await getAction(unpublishRelease.id, invalidId)).toMatchObject({
        isEntryValid: true,
        reason: null,
      });

      // Each edit revalidates in the background: wait for one before the next, so they don't race
      expect(await fixProduct(invalidId)).toMatchObject({ statusCode: 200 });
      expect(
        await waitFor(
          async () => (await getAction(publishRelease.id, invalidId)).isEntryValid === true
        )
      ).toBe(true);

      const breakRes = await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/${productUID}/${invalidId}`,
        body: { name: 'Invalid again', description: null },
      });
      expect(breakRes.statusCode).toBe(200);
      expect(
        await waitFor(
          async () => (await getAction(publishRelease.id, invalidId)).isEntryValid === false
        )
      ).toBe(true);

      expect(await getAction(unpublishRelease.id, invalidId)).toMatchObject({
        isEntryValid: true,
        reason: null,
      });
      expect((await getRelease(unpublishRelease.id)).actions.meta).toEqual({
        count: 1,
        notReadyCount: 0,
      });
    });

    test('switching an action to unpublish clears its reason, and back to publish restores it', async () => {
      const invalidId = await createProduct({ valid: false });
      const release = await createReleaseWithActions('all_or_nothing', [{ documentId: invalidId }]);
      const { id: actionId } = await getAction(release.id, invalidId);

      const changeType = (type: 'publish' | 'unpublish') =>
        rq({
          method: 'PUT',
          url: `/content-releases/${release.id}/actions/${actionId}`,
          body: { type },
        });

      expect((await changeType('unpublish')).statusCode).toBe(200);
      expect(await getAction(release.id, invalidId)).toMatchObject({
        isEntryValid: true,
        reason: null,
      });
      expect((await getRelease(release.id)).actions.meta).toEqual({ count: 1, notReadyCount: 0 });
      // The status is recalculated before the response
      expect((await getRelease(release.id)).status).toBe('ready');

      expect((await changeType('publish')).statusCode).toBe(200);
      expect(await getAction(release.id, invalidId)).toMatchObject({
        isEntryValid: false,
        reason: {
          validation: {
            errors: [{ path: ['description'], message: INVALID_PRODUCT_RECORDED_MESSAGE }],
          },
        },
      });
      expect((await getRelease(release.id)).actions.meta).toEqual({ count: 1, notReadyCount: 1 });
      expect((await getRelease(release.id)).status).toBe('blocked');
    });

    test('the releases list returns the not-ready count of planned releases', async () => {
      const release = await createReleaseWithActions('allow_partial', [
        { documentId: await createProduct({ valid: true }) },
        { documentId: await createProduct({ valid: false }) },
      ]);

      const res = await rq({
        method: 'GET',
        url: '/content-releases',
        qs: { filters: { releasedAt: { $notNull: false } }, pageSize: 100 },
      });

      expect(res.statusCode).toBe(200);
      const listed = res.body.data.find(({ id }) => id === release.id);
      expect(listed.actions.meta).toEqual({ count: 2, notReadyCount: 1 });
    });

    test('the releases of an entry return its validity and reason', async () => {
      const invalidId = await createProduct({ valid: false });
      await createReleaseWithActions('all_or_nothing', [{ documentId: invalidId }]);

      const res = await rq({
        method: 'GET',
        url: '/content-releases/getByDocumentAttached',
        qs: { contentType: productUID, entryDocumentId: invalidId, hasEntryAttached: true },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].actions[0]).toMatchObject({
        type: 'publish',
        isEntryValid: false,
        reason: {
          validation: {
            errors: [{ path: ['description'], message: INVALID_PRODUCT_RECORDED_MESSAGE }],
          },
        },
      });
    });

    test('a client cannot set the validity, reason or outcome of an action it adds', async () => {
      const invalidId = await createProduct({ valid: false });
      const release = (await createRelease()).body.data;

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions`,
        body: {
          contentType: productUID,
          entryDocumentId: invalidId,
          type: 'publish',
          isEntryValid: true,
          reason: { error: { name: 'Injected' } },
          outcome: 'published',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(await getAction(release.id, invalidId)).toMatchObject({
        isEntryValid: false,
        outcome: null,
        reason: { validation: expect.any(Object) },
      });
    });

    describe('with a required review stage', () => {
      let workflow;

      const getStageReason = async (releaseId, documentId) =>
        (await getAction(releaseId, documentId)).reason?.stage;

      beforeAll(async () => {
        const res = await rq({
          method: 'POST',
          url: '/review-workflows/workflows?populate=*',
          body: {
            data: {
              name: `planned-reason-${Math.random().toString(36)}`,
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

      test('an entry not at the required stage stores both stages, until it reaches it', async () => {
        const { data } = await createEntry(reviewItemUID, { name: 'Review item' });
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: data.documentId, contentType: reviewItemUID },
        ]);

        expect(await getStageReason(release.id, data.documentId)).toMatchObject({
          entryStage: { name: 'Review' },
          requiredStage: { name: 'Done' },
        });

        const stageRes = await rq({
          method: 'PUT',
          url: `/review-workflows/content-manager/collection-types/${reviewItemUID}/${data.documentId}/stage`,
          body: { data: { id: workflow.stages[1].id } },
        });
        expect(stageRes.statusCode).toBe(200);

        expect(
          await waitFor(
            async () => (await getAction(release.id, data.documentId)).isEntryValid === true
          )
        ).toBe(true);
        expect((await getAction(release.id, data.documentId)).reason).toBeNull();
      });

      test('changing the required stage updates the stored reason and the release status', async () => {
        const { data } = await createEntry(reviewItemUID, { name: 'Review item' });
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: data.documentId, contentType: reviewItemUID },
        ]);
        expect((await getRelease(release.id)).status).toBe('blocked');

        const updateRes = await rq({
          method: 'PUT',
          url: `/review-workflows/workflows/${workflow.id}?populate=*`,
          body: { data: { stageRequiredToPublishName: 'Review' } },
        });
        expect(updateRes.statusCode).toBe(200);

        // Revalidated once the workflow change commits, after the response
        expect(await waitFor(async () => (await getRelease(release.id)).status === 'ready')).toBe(
          true
        );
        expect(await getAction(release.id, data.documentId)).toMatchObject({
          isEntryValid: true,
          reason: null,
        });

        await rq({
          method: 'PUT',
          url: `/review-workflows/workflows/${workflow.id}?populate=*`,
          body: { data: { stageRequiredToPublishName: 'Done' } },
        });
      });
    });
  });
  describe('Planned entries: review workflow changes', () => {
    const createdWorkflowIds: number[] = [];

    const createWorkflow = async (data) => {
      const res = await rq({
        method: 'POST',
        url: '/review-workflows/workflows?populate=*',
        body: { data: { name: `release-wf-${Math.random().toString(36)}`, ...data } },
      });
      expect(res.statusCode).toBe(201);
      createdWorkflowIds.push(res.body.data.id);

      return res.body.data;
    };

    const getPublishAction = async (releaseId, documentId) =>
      (await getActionsByEntry(releaseId))[documentId];

    const createBlockedRelease = async () => {
      const { data } = await createEntry(reviewItemUID, { name: 'Review item' });
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: data.documentId, contentType: reviewItemUID },
      ]);
      expect((await getRelease(release.id)).status).toBe('blocked');

      return { release, documentId: data.documentId };
    };

    afterEach(async () => {
      for (const id of createdWorkflowIds.splice(0)) {
        await rq({ method: 'DELETE', url: `/review-workflows/workflows/${id}` });
      }
    });

    test('deleting the stage an entry is at moves it, and updates its reason and the release status', async () => {
      const workflow = await createWorkflow({
        contentTypes: [reviewItemUID],
        stages: [{ name: 'Review' }, { name: 'Done' }],
        stageRequiredToPublishName: 'Done',
      });
      const { release, documentId } = await createBlockedRelease();

      const done = workflow.stages.find(({ name }) => name === 'Done');
      const res = await rq({
        method: 'PUT',
        url: `/review-workflows/workflows/${workflow.id}?populate=*`,
        body: {
          data: { stages: [{ id: done.id, name: 'Done' }], stageRequiredToPublishName: 'Done' },
        },
      });
      expect(res.statusCode).toBe(200);

      // Revalidated once the workflow change commits, after the response
      expect(await waitFor(async () => (await getRelease(release.id)).status === 'ready')).toBe(
        true
      );
      expect(await getPublishAction(release.id, documentId)).toMatchObject({
        isEntryValid: true,
        reason: null,
      });
    });

    test('a new workflow without a required stage that takes the content type over unblocks its entries', async () => {
      await createWorkflow({
        contentTypes: [reviewItemUID],
        stages: [{ name: 'Review' }, { name: 'Done' }],
        stageRequiredToPublishName: 'Done',
      });
      const { release, documentId } = await createBlockedRelease();

      await createWorkflow({ contentTypes: [reviewItemUID], stages: [{ name: 'Draft' }] });

      expect(await waitFor(async () => (await getRelease(release.id)).status === 'ready')).toBe(
        true
      );
      expect(await getPublishAction(release.id, documentId)).toMatchObject({
        isEntryValid: true,
        reason: null,
      });
    });

    // Each test holds one transaction open while another runs: SQLite's single connection would
    // run them one after the other, so the interleaving can't happen there
    describeOnCondition(databaseClient !== 'sqlite')('while other transactions run', () => {
      const WORKFLOW_MODEL_UID = 'plugin::review-workflows.workflow';

      // Fails the test after a while, instead of hanging it on a lock wait
      const createSignal = () => {
        let send!: () => void;
        const sent = new Promise<void>((resolve) => {
          send = resolve;
        });
        const wait = (label: string) =>
          Promise.race([
            sent,
            sleep(15_000).then(() => {
              throw new Error(`Timed out waiting for ${label}`);
            }),
          ]);

        return { send, wait };
      };

      test("a workflow change during a scheduled run doesn't stop the run", async () => {
        await createWorkflow({ contentTypes: [reviewItemUID], stages: [{ name: 'Review' }] });
        // Published, then edited: the run replaces the published version
        const { data } = await createEntry(reviewItemUID, { name: 'Version 1' });
        const { documentId } = data;
        await strapi.documents(reviewItemUID).publish({ documentId });
        await strapi.documents(reviewItemUID).update({ documentId, data: { name: 'Version 2' } });
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId, contentType: reviewItemUID },
        ]);

        const runPublishing = createSignal();
        const stagesMoved = createSignal();
        // The run holds the release lock here, and hasn't written the entry yet
        publishPauses.set(documentId, async () => {
          publishPauses.delete(documentId);
          runPublishing.send();
          await stagesMoved.wait('the workflow change');
        });
        // The workflow's transaction has moved the entries' stages here, and goes on
        let armed = true;
        const unsubscribe = strapi.db.lifecycles.subscribe({
          models: [WORKFLOW_MODEL_UID],
          afterCreate() {
            if (armed) {
              armed = false;
              stagesMoved.send();
            }
          },
        });

        try {
          const run = runScheduled(release.id);
          await runPublishing.wait('the run');

          // Takes the content type over: every entry moves to the new workflow's first stage
          const [released] = await Promise.all([
            run,
            createWorkflow({ contentTypes: [reviewItemUID], stages: [{ name: 'Draft' }] }),
          ]);
          expect(released.status).toBe('done');
        } finally {
          unsubscribe();
          publishPauses.delete(documentId);
        }

        const published = await strapi
          .documents(reviewItemUID)
          .findOne({ documentId, status: 'published' });
        expect(published.name).toBe('Version 2');
      });

      test('an entry added during a workflow change keeps the release blocked', async () => {
        const workflow = await createWorkflow({
          contentTypes: [reviewItemUID],
          stages: [{ name: 'Review' }, { name: 'Done' }],
          stageRequiredToPublishName: 'Done',
        });
        // Not at the required stage, but valid
        const { release, documentId } = await createBlockedRelease();
        // Too short a code to publish, whatever the stage
        const { data: invalid } = await createEntry(reviewItemUID, { name: 'Invalid', code: 'ab' });

        const workflowWritten = createSignal();
        const entryAdded = createSignal();
        // Inside the workflow's transaction, after its first reads
        let armed = true;
        const unsubscribe = strapi.db.lifecycles.subscribe({
          models: [WORKFLOW_MODEL_UID],
          async afterUpdate() {
            if (armed) {
              armed = false;
              workflowWritten.send();
              await entryAdded.wait('the entry to be added');
            }
          },
        });

        try {
          // The entry is now at the required stage: its action becomes publishable
          // (Promise.resolve sends the request: it's only sent once awaited)
          const workflowChange = Promise.resolve(
            rq({
              method: 'PUT',
              url: `/review-workflows/workflows/${workflow.id}?populate=*`,
              body: { data: { stageRequiredToPublishName: 'Review' } },
            })
          );
          await workflowWritten.wait('the workflow change');

          const res = await createReleaseAction(release.id, {
            contentType: reviewItemUID,
            entryDocumentId: invalid.documentId,
            type: 'publish',
          });
          expect(res.statusCode).toBe(201);
          entryAdded.send();

          expect((await workflowChange).statusCode).toBe(200);
        } finally {
          unsubscribe();
        }

        // Revalidated once the workflow change commits, after the response
        expect(
          await waitFor(
            async () => (await getPublishAction(release.id, documentId)).isEntryValid === true
          )
        ).toBe(true);
        // The added entry still can't be published
        expect((await getRelease(release.id)).status).toBe('blocked');
      });
    });
  });

  describe('Overdue releases', () => {
    const RELEASE_UID = 'plugin::content-releases.release';
    const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000);

    const sweep = () =>
      strapi.plugin('content-releases').service('scheduling').freezeOverdueReleases();

    const runAfterSync = () =>
      strapi.hook('strapi::content-types.afterSync').call({
        oldContentTypes: strapi.contentTypes,
        contentTypes: strapi.contentTypes,
      });

    beforeAll(() => {
      strapi.cron.remove('content-releases::freezeOverdueReleases');
    });

    const setReleaseState = (id, data) =>
      strapi.db.query(RELEASE_UID).update({ where: { id }, data });

    const sweepListeningToWebhooks = async (releaseId) => {
      const onPublishEvent = jest.fn();
      const stopListening = strapi.eventHub.on('releases.publish', onPublishEvent);

      try {
        await sweep();
      } finally {
        stopListening();
      }

      return onPublishEvent.mock.calls
        .map(([payload]) => payload)
        .filter((payload) => payload.release?.id === releaseId);
    };

    test('a release whose scheduled time passed is frozen as failed, and nothing is published', async () => {
      const productId = await createProduct({ valid: true });
      const invalidId = await createProduct({ valid: false });
      const release = await createReleaseWithActions('allow_partial', [
        { documentId: productId },
        { documentId: invalidId },
      ]);
      await setReleaseState(release.id, { scheduledAt: minutesFromNow(-10) });

      const webhooks = await sweepListeningToWebhooks(release.id);

      expect(await getRelease(release.id)).toMatchObject({
        status: 'failed',
        releasedAt: expect.any(String),
        failureReason: 'missed_schedule',
        totalPublishedEntries: 0,
        totalUnpublishedEntries: 0,
        totalSkippedEntries: 2,
      });
      expect(await hasPublishedVersion(productUID, productId)).toBe(false);

      const actions = await getActionsByEntry(release.id);
      expect(actions[productId]).toMatchObject({
        outcome: 'skipped_missed',
        isEntryValid: true,
        reason: null,
      });
      expect(actions[invalidId]).toMatchObject({
        outcome: 'skipped_missed',
        isEntryValid: false,
        reason: { validation: { errors: [expect.objectContaining({ path: ['description'] })] } },
      });

      expect(webhooks).toHaveLength(1);
      expect(webhooks[0]).toMatchObject({
        isPublished: false,
        error: { name: 'MissedSchedule' },
        release: {
          id: release.id,
          status: 'failed',
          failureReason: 'missed_schedule',
          totalSkippedEntries: 2,
        },
      });
    });

    test('two nodes sweeping at once freeze and report a release once', async () => {
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: await createProduct({ valid: true }) },
      ]);
      await setReleaseState(release.id, { scheduledAt: minutesFromNow(-10) });

      const onPublishEvent = jest.fn();
      const stopListening = strapi.eventHub.on('releases.publish', onPublishEvent);
      const scheduling = strapi.plugin('content-releases').service('scheduling');
      try {
        const [first, second] = await Promise.all([
          scheduling.sweepOverdueReleases(new Date()),
          scheduling.sweepOverdueReleases(new Date()),
        ]);

        expect([...first, ...second].filter((frozen) => frozen.id === release.id)).toHaveLength(1);
      } finally {
        stopListening();
      }

      expect(
        onPublishEvent.mock.calls.filter(([payload]) => payload.release?.id === release.id)
      ).toHaveLength(1);
      expect(await getRelease(release.id)).toMatchObject({ totalSkippedEntries: 1 });
    });

    test('a release that failed before the upgrade is frozen at startup, without a webhook', async () => {
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: await createProduct({ valid: false }) },
      ]);
      await setReleaseState(release.id, { status: 'failed', scheduledAt: minutesFromNow(-10) });

      await runAfterSync();
      const webhooks = await sweepListeningToWebhooks(release.id);

      expect(await getRelease(release.id)).toMatchObject({
        status: 'failed',
        releasedAt: expect.any(String),
        failureReason: 'failed_before_upgrade',
        totalPublishedEntries: null,
        totalUnpublishedEntries: null,
        totalSkippedEntries: null,
      });
      expect(Object.values(await getActionsByEntry(release.id))).toEqual([
        expect.objectContaining({ outcome: null }),
      ]);
      expect(webhooks).toHaveLength(0);
    });

    test.each([
      ['overdue by less than the grace period', { scheduledAt: minutesFromNow(-2) }],
      ['scheduled in the future', { scheduledAt: minutesFromNow(60) }],
      ['not scheduled', {}],
    ])('a planned release %s is left as it is', async (_, state) => {
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: await createProduct({ valid: true }) },
      ]);
      await setReleaseState(release.id, state);

      await sweep();

      expect(await getRelease(release.id)).toMatchObject({
        status: 'ready',
        releasedAt: null,
        failureReason: null,
      });
    });

    test('a release that ran normally has no failure reason', async () => {
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: await createProduct({ valid: true }) },
      ]);

      expect((await publishManually(release.id)).statusCode).toBe(200);
      await setReleaseState(release.id, { scheduledAt: minutesFromNow(-10) });
      await sweep();

      expect(await getRelease(release.id)).toMatchObject({
        status: 'done',
        failureReason: null,
        totalPublishedEntries: 1,
        totalSkippedEntries: 0,
      });
    });

    test('a frozen release refuses a reschedule and a delete, and stays as the sweep left it', async () => {
      const release = await createReleaseWithActions('all_or_nothing', [
        { documentId: await createProduct({ valid: true }) },
      ]);
      await setReleaseState(release.id, { scheduledAt: minutesFromNow(-10) });
      await sweep();
      const frozen = await getRelease(release.id);
      expect(frozen).toMatchObject({ status: 'failed', failureReason: 'missed_schedule' });

      const rescheduled = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}`,
        body: { name: frozen.name, scheduledAt: minutesFromNow(60), timezone: 'Europe/Paris' },
      });
      const deleted = await rq({ method: 'DELETE', url: `/content-releases/${release.id}` });

      expect(rescheduled.statusCode).toBe(400);
      expect(rescheduled.body.error.message).toBe('Release already published');
      expect(deleted.statusCode).toBe(400);
      expect(deleted.body.error.message).toBe('Release already published');
      expect(await getRelease(release.id)).toMatchObject({
        status: 'failed',
        scheduledAt: frozen.scheduledAt,
        releasedAt: frozen.releasedAt,
      });
    });

    test.each([
      [
        "the entries' outcomes",
        'beforeUpdateMany',
        'plugin::content-releases.release-action',
        (data) => data?.outcome === 'skipped_missed',
      ],
      ['the release', 'beforeUpdate', RELEASE_UID, (data) => Boolean(data?.failureReason)],
    ])(
      'a release whose freeze fails writing %s is left planned, and frozen by the next sweep',
      async (_, lifecycle, model, isFreezeWrite) => {
        const release = await createReleaseWithActions('all_or_nothing', [
          { documentId: await createProduct({ valid: true }) },
        ]);
        await setReleaseState(release.id, { scheduledAt: minutesFromNow(-10) });

        let failNextFreeze = true;
        const unsubscribe = strapi.db.lifecycles.subscribe({
          models: [model],
          async [lifecycle](event) {
            if (failNextFreeze && isFreezeWrite(event.params.data)) {
              failNextFreeze = false;
              await failInDatabase();
            }
          },
        });

        try {
          await sweep();
          expect(failNextFreeze).toBe(false);
          expect(await getRelease(release.id)).toMatchObject({
            status: 'ready',
            releasedAt: null,
            failureReason: null,
            totalSkippedEntries: null,
          });
          expect(Object.values(await getActionsByEntry(release.id))).toEqual([
            expect.objectContaining({ outcome: null }),
          ]);

          await sweep();
          expect(await getRelease(release.id)).toMatchObject({
            status: 'failed',
            failureReason: 'missed_schedule',
            totalSkippedEntries: 1,
          });
          expect(Object.values(await getActionsByEntry(release.id))).toEqual([
            expect.objectContaining({ outcome: 'skipped_missed' }),
          ]);
        } finally {
          unsubscribe();
        }
      }
    );
  });
});
