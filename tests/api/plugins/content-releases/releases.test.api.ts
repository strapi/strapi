'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';

import { CreateRelease } from '../../../../packages/core/content-releases/shared/contracts/releases';

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

describeOnCondition(edition === 'EE')('Content Releases API', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let validEntries = [];
  let invalidEntries = [];

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
    const releases = await rq({
      method: 'GET',
      url: '/content-releases',
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

  beforeAll(async () => {
    await builder.addContentType(productModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

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
