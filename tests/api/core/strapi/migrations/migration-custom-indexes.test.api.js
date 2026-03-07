'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const unifiedIndexesModel = {
  kind: 'collectionType',
  displayName: 'Unified Index Entry',
  singularName: 'unified-index-entry',
  pluralName: 'unified-index-entries',
  draftAndPublish: false,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  indexes: [
    { name: 'unified_legacy_title_locale_uq', type: 'unique', columns: ['title', 'locale'] },
    { type: 'unique', attributes: ['variantSlug'], scope: 'variant' },
    { type: 'unique', attributes: ['globalSlug'], scope: 'global' },
    { type: 'unique', attributes: ['headline', 'category'], scope: 'variant' },
  ],
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    variantSlug: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    category: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    headline: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    globalSlug: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const createEntry = async (uid, body, locale = 'en') => {
  return rq({
    method: 'POST',
    url: `/content-manager/collection-types/${uid}`,
    qs: { locale },
    body: { ...body, locale },
  });
};

const expectRejectedCreate = (res) => {
  expect(res.statusCode).toBeGreaterThanOrEqual(400);
  expect(res.statusCode).toBeLessThan(600);
};

describe('Migration - custom schema indexes', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([unifiedIndexesModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'French', code: 'fr' }])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('legacy columns unique rejects duplicate in same locale, allows duplicate in another locale', async () => {
    const uid = 'api::unified-index-entry.unified-index-entry';
    const first = await createEntry(uid, { title: 'same-title' }, 'en');
    const duplicateSameLocale = await createEntry(uid, { title: 'same-title' }, 'en');
    const duplicateOtherLocale = await createEntry(uid, { title: 'same-title' }, 'fr');

    expect(first.statusCode).toBe(201);
    expectRejectedCreate(duplicateSameLocale);
    expect(duplicateOtherLocale.statusCode).toBe(201);
  });

  test('single-attribute variant scope is unique per locale', async () => {
    const uid = 'api::unified-index-entry.unified-index-entry';
    const first = await createEntry(uid, { variantSlug: 'variant-same', globalSlug: 'g-1' }, 'en');
    const duplicateSameLocale = await createEntry(
      uid,
      { variantSlug: 'variant-same', globalSlug: 'g-2' },
      'en'
    );
    const duplicateOtherLocale = await createEntry(
      uid,
      { variantSlug: 'variant-same', globalSlug: 'g-3' },
      'fr'
    );

    expect(first.statusCode).toBe(201);
    expectRejectedCreate(duplicateSameLocale);
    expect(duplicateOtherLocale.statusCode).toBe(201);
  });

  test('single-attribute global scope is unique across locales', async () => {
    const uid = 'api::unified-index-entry.unified-index-entry';
    const first = await createEntry(
      uid,
      { variantSlug: 'variant-a', globalSlug: 'global-same' },
      'en'
    );
    const duplicateOtherLocale = await createEntry(
      uid,
      { variantSlug: 'variant-b', globalSlug: 'global-same' },
      'fr'
    );

    expect(first.statusCode).toBe(201);
    expectRejectedCreate(duplicateOtherLocale);
  });

  test('multi-attribute variant scope is unique per locale for tuple', async () => {
    const uid = 'api::unified-index-entry.unified-index-entry';
    const first = await createEntry(uid, { headline: 'news', category: 'tech' }, 'en');
    const duplicateSameTupleAndLocale = await createEntry(
      uid,
      { headline: 'news', category: 'tech' },
      'en'
    );
    const sameTitleDifferentCategory = await createEntry(
      uid,
      { headline: 'news', category: 'sports' },
      'en'
    );
    const sameTupleDifferentLocale = await createEntry(
      uid,
      { headline: 'news', category: 'tech' },
      'fr'
    );

    expect(first.statusCode).toBe(201);
    expectRejectedCreate(duplicateSameTupleAndLocale);
    expect(sameTitleDifferentCategory.statusCode).toBe(201);
    expect(sameTupleDifferentLocale.statusCode).toBe(201);
  });
});
