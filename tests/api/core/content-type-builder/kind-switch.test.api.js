/**
 * Integration test for the collectionType to singleType switch through update-schema
 */

'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

const MANY_UID = 'api::kind-switch-many.kind-switch-many';
const SINGLE_UID = 'api::kind-switch-single.kind-switch-single';

const manyModel = {
  uid: MANY_UID,
  displayName: 'Kind Switch Many',
  singularName: 'kind-switch-many',
  pluralName: 'kind-switch-manies',
  kind: 'collectionType',
  draftAndPublish: false,
  attributes: [{ action: 'create', name: 'title', properties: { type: 'string' } }],
};

const singleModel = {
  uid: SINGLE_UID,
  displayName: 'Kind Switch Single',
  singularName: 'kind-switch-single',
  pluralName: 'kind-switch-singles',
  kind: 'collectionType',
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  attributes: [
    {
      action: 'create',
      name: 'title',
      properties: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    },
  ],
};

const builder = createTestBuilder();
let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const updateSchema = (...contentTypes) => {
  return rq({
    method: 'POST',
    url: '/content-type-builder/update-schema',
    body: { data: { contentTypes, components: [] } },
  });
};

const manyUpdate = (kind, displayName = manyModel.displayName) => ({
  action: 'update',
  uid: MANY_UID,
  displayName,
  kind,
  draftAndPublish: false,
  attributes: [{ action: 'update', name: 'title', properties: { type: 'string' } }],
});

describe('Content Type Builder - update-schema kind switch with existing rows', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const created = await updateSchema(
      { action: 'create', ...manyModel },
      { action: 'create', ...singleModel }
    );
    expect(created.statusCode).toBe(200);
    await restart();

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });

    await strapi.documents(MANY_UID).create({ data: { title: 'First' } });
    await strapi.documents(MANY_UID).create({ data: { title: 'Second' } });

    const { documentId } = await strapi.documents(SINGLE_UID).create({
      locale: 'en',
      data: { title: 'English' },
    });
    await strapi.documents(SINGLE_UID).update({
      documentId,
      locale: 'fr',
      data: { title: 'French' },
    });
    await strapi.documents(SINGLE_UID).publish({ documentId, locale: '*' });
  });

  afterAll(async () => {
    await updateSchema({ action: 'delete', uid: MANY_UID }, { action: 'delete', uid: SINGLE_UID });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('refuses to convert a collection type holding several documents', async () => {
    const res = await updateSchema(manyUpdate('singleType'));

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      'You cannot convert a collectionType to a singleType when having multiple entries in DB'
    );

    await restart();

    expect(strapi.contentTypes[MANY_UID].kind).toBe('collectionType');
    expect(await strapi.db.query(MANY_UID).count()).toBe(2);
  });

  test('saves a collection type holding several documents when the kind does not change', async () => {
    const res = await updateSchema(manyUpdate('collectionType', 'Kind Switch Many Renamed'));

    expect(res.statusCode).toBe(200);

    await restart();

    expect(strapi.contentTypes[MANY_UID].kind).toBe('collectionType');
    expect(strapi.contentTypes[MANY_UID].info.displayName).toBe('Kind Switch Many Renamed');
    expect(await strapi.db.query(MANY_UID).count()).toBe(2);
  });

  test('converts a collection type whose only document has draft, published and locale rows', async () => {
    // One document: a draft and a published row in each of two locales
    expect(await strapi.db.query(SINGLE_UID).count()).toBe(4);

    const res = await updateSchema({
      action: 'update',
      uid: SINGLE_UID,
      displayName: singleModel.displayName,
      kind: 'singleType',
      draftAndPublish: true,
      pluginOptions: { i18n: { localized: true } },
      attributes: [
        {
          action: 'update',
          name: 'title',
          properties: { type: 'string', pluginOptions: { i18n: { localized: true } } },
        },
      ],
    });

    expect(res.statusCode).toBe(200);

    // The core router memoizes its routes per module, so reload the app modules as a new process would
    jest.resetModules();
    await restart();

    expect(strapi.contentTypes[SINGLE_UID].kind).toBe('singleType');
    expect(await strapi.db.query(SINGLE_UID).count()).toBe(4);
  });
});
