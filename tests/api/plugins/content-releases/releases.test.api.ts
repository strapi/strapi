'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';

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
  const data = {
    releases: [],
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
    await builder.addContentTypes([productModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    // Create products
    await Promise.all([
      createEntry(productUID, { name: 'Product 1', description: 'Description' }),
      createEntry(productUID, { name: 'Product 2' }),
      createEntry(productUID, { name: 'Product 3', description: 'Description' }),
      createEntry(productUID, { name: 'Product 4', description: 'Description' }),
      createEntry(productUID, { name: 'Product 5', description: 'Description' }),
    ]);

    await deleteAllReleases();
  });

  afterAll(async () => {
    jest.useRealTimers();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create Release', () => {
    test('Create a release', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-releases/',
        body: {
          name: 'Test Release',
          scheduledAt: null,
        },
      });

      data.releases.push(res.body.data);

      expect(res.statusCode).toBe(200);
    });

    test('cannot create a release with the same name', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-releases/',
        body: {
          name: 'Test Release',
          scheduledAt: null,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Release with name Test Release already exists');
    });

    test('cannot create a scheduled release without timezone', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-releases/',
        body: {
          name: 'Test Scheduled Release',
          scheduledAt: '2024-10-10T00:00:00.000Z',
          isScheduled: true,
          time: '00:00',
          date: '2024-10-10',
          timezone: null,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('timezone is a required field');
    });

    test('create a scheduled release', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-releases/',
        body: {
          name: 'Test Scheduled Release',
          scheduledAt: '2024-10-10T00:00:00.000Z',
          isScheduled: true,
          time: '00:00',
          date: '2024-10-10',
          timezone: 'Europe/Madrid',
        },
      });

      data.releases.push(res.body.data);

      expect(res.statusCode).toBe(200);
    });

    test('cannot create a scheduled release with date in the past', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-releases/',
        body: {
          name: 'Test Scheduled Release',
          scheduledAt: '2022-10-10T00:00:00.000Z',
          isScheduled: true,
          time: '00:00',
          date: '2022-01-01',
          timezone: 'Europe/Madrid',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Scheduled at must be later than now');
    });
  });

  // Depends on the previous test
  describe('Create Release Actions', () => {
    test('Create a release action with valid status', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions`,
        body: {
          entry: {
            id: 1,
            contentType: productUID,
          },
          type: 'publish',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isEntryValid).toBe(true);
    });

    test('Create a release action with invalid status', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions`,
        body: {
          entry: {
            id: 2,
            contentType: productUID,
          },
          type: 'unpublish',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isEntryValid).toBe(false);
    });

    test('cannot create an action with invalid contentTypeUid', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions`,
        body: {
          entry: {
            id: 1,
            contentType: 'invalid',
          },
          type: 'publish',
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe('No content type found for uid invalid');
    });

    test('throws an error when trying to add an entry that is already in the release', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions`,
        body: {
          entry: {
            id: 1,
            contentType: productUID,
          },
          type: 'publish',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe(
        'Entry with id 1 and contentType api::product.product already exists in release with id 1'
      );
    });
  });

  // Depends on the previous test
  describe('Create Many Release Actions', () => {
    test('Create many release actions', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions/bulk`,
        body: [
          {
            entry: {
              id: 3,
              contentType: productUID,
            },
            type: 'publish',
          },
          {
            entry: {
              id: 4,
              contentType: productUID,
            },
            type: 'publish',
          },
        ],
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.entriesAlreadyInRelease).toBe(0);
      expect(res.body.meta.totalEntries).toBe(2);
    });

    test('If entry is already in the release, it should not be added', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions/bulk`,
        body: [
          {
            type: 'publish',
            entry: {
              id: 4,
              contentType: productUID,
            },
          },
          {
            entry: {
              id: 5,
              contentType: productUID,
            },
            type: 'publish',
          },
        ],
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.entriesAlreadyInRelease).toBe(1);
      expect(res.body.meta.totalEntries).toBe(2);
    });
  });

  // Depends on the previous test
  describe('Find Many Release Actions', () => {
    test('Find many release actions', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}/actions`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.Product.length).toBe(5);
    });

    test('Group by action type', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}/actions?groupBy=action`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.publish.length).toBe(4);
      expect(res.body.data.unpublish.length).toBe(1);
    });
  });

  // Depends on the previous test
  describe('Edit Release Action', () => {
    test('Edit a release action', async () => {
      const release = data.releases[0];

      const changeToUnpublishRes = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}/actions/1`,
        body: {
          type: 'unpublish',
        },
      });

      expect(changeToUnpublishRes.statusCode).toBe(200);
      expect(changeToUnpublishRes.body.data.type).toBe('unpublish');

      const changeToPublishRes = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}/actions/1`,
        body: {
          type: 'publish',
        },
      });

      expect(changeToPublishRes.statusCode).toBe(200);
      expect(changeToPublishRes.body.data.type).toBe('publish');
    });
  });

  // Depends on the previous test
  describe('Delete a Release Action', () => {
    test('Delete a release action', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'DELETE',
        url: `/content-releases/${release.id}/actions/2`,
      });

      expect(res.statusCode).toBe(200);
    });

    test('cannot delete a release action that does not exist', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'DELETE',
        url: `/content-releases/${release.id}/actions/2`,
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe(
        'Action with id 2 not found in release with id 1 or it is already published'
      );
    });
  });

  // Depends on the previous test
  describe('Find One Release', () => {
    test('Find a release', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe(release.name);
      expect(res.body.data.status).toBe('ready');
    });

    test('Release status is empty if doesnt have any actions', async () => {
      const release = data.releases[1];

      const res = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe(release.name);
      expect(res.body.data.status).toBe('empty');
    });

    test('Release status is blocked if at least one action is invalid and then change to ready if removed', async () => {
      const release = data.releases[0];

      const addEntryRes = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions`,
        body: {
          entry: {
            id: 2,
            contentType: productUID,
          },
          type: 'publish',
        },
      });
      const actionId = addEntryRes.body.data.id;

      expect(addEntryRes.statusCode).toBe(200);

      const findBlockedRes = await rq({
        method: 'GET',
        url: `/content-releases/${release.id}`,
      });

      expect(findBlockedRes.statusCode).toBe(200);
      expect(findBlockedRes.body.data.name).toBe(release.name);
      expect(findBlockedRes.body.data.status).toBe('blocked');

      const removeEntryRes = await rq({
        method: 'DELETE',
        url: `/content-releases/${release.id}/actions/${actionId}`,
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

  // Depends on the previous test
  describe('Edit Release', () => {
    test('Edit a release', async () => {
      const release = data.releases[0];

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
      const release = data.releases[0];
      const release2 = data.releases[1];

      const res = await rq({
        method: 'PUT',
        url: `/content-releases/${release.id}`,
        body: {
          name: release2.name,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe(`Release with name ${release2.name} already exists`);
    });
  });

  // Depends on the previous test
  describe('Publish Release', () => {
    test('Publish a release', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('done');
    });

    test('cannot publish a release that is already published', async () => {
      const release = data.releases[0];

      const res = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/publish`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Release already published');
    });

    test('cannot publish a release if at least one action is invalid', async () => {
      const release = data.releases[1];

      const addEntryRes = await rq({
        method: 'POST',
        url: `/content-releases/${release.id}/actions`,
        body: {
          entry: {
            id: 2,
            contentType: productUID,
          },
          type: 'publish',
        },
      });

      expect(addEntryRes.statusCode).toBe(200);

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

  // Depends on the previous test
  describe('Find Many Releases', () => {
    test('Find many not published releases', async () => {
      const createRes = await rq({
        method: 'POST',
        url: '/content-releases/',
        body: {
          name: 'Test Release 3',
          scheduledAt: null,
        },
      });

      data.releases.push(createRes.body.data);

      expect(createRes.statusCode).toBe(200);

      const res = await rq({
        method: 'GET',
        url: '/content-releases?filters[releasedAt][$notNull]=false',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.pendingReleasesCount).toBe(2);
    });

    test('Find many published releases', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-releases?filters[releasedAt][$notNull]=true',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('done');
    });

    test('Find many releases with an entry attached', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-releases?contentTypeUid=${productUID}&entryId=2&hasEntryAttached=true`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Test Scheduled Release');
    });

    test('Find many releases without an entry attached', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-releases?contentTypeUid=${productUID}&entryId=2&hasEntryAttached=false`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Test Release 3');
    });
  });

  // Depends on the previous test
  describe('Delete Release', () => {
    test('Delete a release', async () => {
      const release = data.releases.pop();

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
