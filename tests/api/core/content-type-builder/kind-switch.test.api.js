/**
 * Integration test for the collectionType to singleType switch through update-schema
 */

'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

const MANY_UID = 'api::kind-switch-many.kind-switch-many';
const SINGLE_UID = 'api::kind-switch-single.kind-switch-single';
const LOCALIZED_UID = 'api::kind-switch-localized.kind-switch-localized';

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

const localizedModel = {
  ...singleModel,
  uid: LOCALIZED_UID,
  displayName: 'Kind Switch Localized',
  singularName: 'kind-switch-localized',
  pluralName: 'kind-switch-localizeds',
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

const localizedSingleTypeUpdate = (model) => ({
  action: 'update',
  uid: model.uid,
  displayName: model.displayName,
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

describe('Content Type Builder - update-schema kind switch with existing rows', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const created = await updateSchema(
      { action: 'create', ...manyModel },
      { action: 'create', ...singleModel },
      { action: 'create', ...localizedModel }
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

    // A document with draft and published rows in two locales
    const published = await strapi.documents(LOCALIZED_UID).create({
      locale: 'en',
      data: { title: 'Published' },
    });
    await strapi.documents(LOCALIZED_UID).update({
      documentId: published.documentId,
      locale: 'fr',
      data: { title: 'Publié' },
    });
    await strapi.documents(LOCALIZED_UID).publish({
      documentId: published.documentId,
      locale: '*',
    });
    // A second document that only has a draft in the non-default locale
    await strapi.documents(LOCALIZED_UID).create({ locale: 'fr', data: { title: 'Brouillon' } });
  });

  afterAll(async () => {
    const deleted = await updateSchema(
      { action: 'delete', uid: MANY_UID },
      { action: 'delete', uid: SINGLE_UID },
      { action: 'delete', uid: LOCALIZED_UID }
    );
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();

    expect(deleted.statusCode).toBe(200);
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

  test('refuses to convert when another document only has a draft in another locale', async () => {
    // 2 draft + 2 published rows for the first document, 1 fr draft row for the second
    expect(await strapi.db.query(LOCALIZED_UID).count()).toBe(5);

    const res = await updateSchema(localizedSingleTypeUpdate(localizedModel));

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      'You cannot convert a collectionType to a singleType when having multiple entries in DB'
    );

    await restart();

    expect(strapi.contentTypes[LOCALIZED_UID].kind).toBe('collectionType');
    expect(await strapi.db.query(LOCALIZED_UID).count()).toBe(5);
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

    const res = await updateSchema(localizedSingleTypeUpdate(singleModel));

    expect(res.statusCode).toBe(200);

    // The core router memoizes its routes per module, so reload the app modules as a new process would
    jest.resetModules();
    await restart();

    expect(strapi.contentTypes[SINGLE_UID].kind).toBe('singleType');
    expect(await strapi.db.query(SINGLE_UID).count()).toBe(4);
  });
});
