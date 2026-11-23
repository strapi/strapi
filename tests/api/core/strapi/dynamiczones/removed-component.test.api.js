'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

// A component with media makes the cleanup pass load the zone with a populate per component type
const withMediaComponent = {
  displayName: 'block-with-media',
  attributes: {
    title: { type: 'string' },
    picture: { type: 'media' },
  },
};

const removedComponent = {
  displayName: 'block-removed',
  attributes: {
    title: { type: 'string' },
  },
};

const WITH_MEDIA_UID = 'default.block-with-media';
const REMOVED_UID = 'default.block-removed';

const contentType = {
  displayName: 'zonewithremovedblock',
  singularName: 'zonewithremovedblock',
  pluralName: 'zonewithremovedblocks',
  draftAndPublish: true,
  attributes: {
    zone: {
      type: 'dynamiczone',
      components: [WITH_MEDIA_UID, REMOVED_UID],
    },
  },
};

const CT_UID = 'api::zonewithremovedblock.zonewithremovedblock';
const CM_URL = `/content-manager/collection-types/${CT_UID}`;

const findBlock = (uid, id) => strapi.db.query(uid).findOne({ where: { id } });

const findZone = async (documentId) => {
  const entry = await strapi.documents(CT_UID).findOne({ documentId, populate: { zone: true } });

  return entry.zone;
};

describe('Dynamic zone holding a block of a component type removed from the zone', () => {
  const builder = createTestBuilder();
  const entries = {};

  beforeAll(async () => {
    await builder
      .addComponent(withMediaComponent)
      .addComponent(removedComponent)
      .addContentType(contentType)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Entries holding a block of the type that is about to be removed from the zone
    for (const name of ['emptied', 'replaced', 'kept']) {
      const res = await rq({
        method: 'POST',
        url: CM_URL,
        body: { zone: [{ __component: REMOVED_UID, title: name }] },
      });

      expect(res.statusCode).toBe(201);
      entries[name] = { documentId: res.body.data.documentId, blockId: res.body.data.zone[0].id };
    }

    // Remove the component from the zone, as the Content-Type Builder does
    const res = await rq({
      method: 'PUT',
      url: `/content-type-builder/content-types/${CT_UID}`,
      body: {
        contentType: {
          ...contentType,
          attributes: { zone: { type: 'dynamiczone', components: [WITH_MEDIA_UID] } },
        },
      },
    });

    expect(res.statusCode).toBe(201);

    await restart();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('The stored block survives the schema change', async () => {
    expect(strapi.getModel(CT_UID).attributes.zone.components).toEqual([WITH_MEDIA_UID]);
    await expect(findBlock(REMOVED_UID, entries.emptied.blockId)).resolves.toMatchObject({
      title: 'emptied',
    });
  });

  test('Emptying the zone deletes the block', async () => {
    const { documentId, blockId } = entries.emptied;

    const res = await rq({ method: 'PUT', url: `${CM_URL}/${documentId}`, body: { zone: [] } });

    expect(res.statusCode).toBe(200);
    await expect(findBlock(REMOVED_UID, blockId)).resolves.toBeNull();
    await expect(findZone(documentId)).resolves.toEqual([]);
  });

  test('Sending the block back with its id keeps it and updates it', async () => {
    const { documentId, blockId } = entries.kept;

    const res = await rq({
      method: 'PUT',
      url: `${CM_URL}/${documentId}`,
      body: { zone: [{ __component: REMOVED_UID, id: blockId, title: 'kept, renamed' }] },
    });

    expect(res.statusCode).toBe(200);
    await expect(findBlock(REMOVED_UID, blockId)).resolves.toMatchObject({
      title: 'kept, renamed',
    });
    await expect(findZone(documentId)).resolves.toMatchObject([
      { __component: REMOVED_UID, id: blockId, title: 'kept, renamed' },
    ]);
  });

  test('Replacing the block with one of a remaining type deletes it', async () => {
    const { documentId, blockId } = entries.replaced;

    const res = await rq({
      method: 'PUT',
      url: `${CM_URL}/${documentId}`,
      body: { zone: [{ __component: WITH_MEDIA_UID, title: 'new' }] },
    });

    expect(res.statusCode).toBe(200);
    await expect(findBlock(REMOVED_UID, blockId)).resolves.toBeNull();
    await expect(findZone(documentId)).resolves.toMatchObject([
      { __component: WITH_MEDIA_UID, title: 'new' },
    ]);
  });
});
