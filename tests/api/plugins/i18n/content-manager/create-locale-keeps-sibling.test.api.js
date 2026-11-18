'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
const uid = 'api::sibling.sibling';

const seoComponent = {
  displayName: 'seo',
  category: 'default',
  attributes: {
    metaTitle: {
      type: 'string',
    },
  },
};

const model = {
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
    code: {
      type: 'string',
      pluginOptions: { i18n: { localized: false } },
    },
    seo: {
      type: 'component',
      component: 'default.seo',
      repeatable: false,
      pluginOptions: { i18n: { localized: false } },
    },
  },
  draftAndPublish: true,
  displayName: 'Sibling',
  singularName: 'sibling',
  pluralName: 'siblings',
  pluginOptions: { i18n: { localized: true } },
};

const findRow = (strapi, documentId, locale, status) =>
  strapi.db.query(uid).findOne({
    where: {
      documentId,
      locale,
      publishedAt: status === 'published' ? { $ne: null } : null,
    },
    populate: { seo: true },
  });

const expectUnchanged = (after, before) => {
  expect(new Date(after.updatedAt).getTime()).toBe(new Date(before.updatedAt).getTime());
  expect(after.seo.id).toBe(before.seo.id);
};

describe('creating a locale keeps sibling rows', () => {
  let strapi;

  beforeAll(async () => {
    await builder.addComponent(seoComponent).addContentType(model).build();
    strapi = await createStrapiInstance();
    await strapi.plugin('i18n').service('locales').create({ code: 'fr', name: 'French' });
  }, 120000);

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('does not rewrite the default locale draft when a new locale copies its shared values', async () => {
    const created = await strapi.documents(uid).create({
      locale: 'en',
      data: { title: 'en', code: 'same', seo: { metaTitle: 'same' } },
      status: 'published',
    });

    const before = await findRow(strapi, created.documentId, 'en', 'draft');
    expect(before.seo.id).toEqual(expect.any(Number));

    await strapi.documents(uid).update({
      documentId: created.documentId,
      locale: 'fr',
      data: { title: 'fr', code: 'same', seo: { metaTitle: 'same' } },
    });

    const after = await findRow(strapi, created.documentId, 'en', 'draft');
    const published = await findRow(strapi, created.documentId, 'en', 'published');

    expectUnchanged(after, before);
    expect(new Date(after.updatedAt).getTime()).toBeLessThanOrEqual(
      new Date(published.updatedAt).getTime()
    );
  });

  test('does not rewrite the other locale when a write without a locale creates the default locale row', async () => {
    const created = await strapi.documents(uid).create({
      locale: 'fr',
      data: { title: 'fr', code: 'same', seo: { metaTitle: 'same' } },
    });

    const before = await findRow(strapi, created.documentId, 'fr', 'draft');

    await strapi.documents(uid).update({
      documentId: created.documentId,
      data: { title: 'en', code: 'same', seo: { metaTitle: 'same' } },
    });

    const english = await findRow(strapi, created.documentId, 'en', 'draft');
    expect(english).toBeTruthy();
    expectUnchanged(await findRow(strapi, created.documentId, 'fr', 'draft'), before);
  });

  test('does not rewrite the published default locale on the first publish of a new locale', async () => {
    const created = await strapi.documents(uid).create({
      locale: 'en',
      data: { title: 'en', code: 'same', seo: { metaTitle: 'same' } },
      status: 'published',
    });

    await strapi.documents(uid).update({
      documentId: created.documentId,
      locale: 'fr',
      data: { title: 'fr', code: 'same', seo: { metaTitle: 'same' } },
    });

    const before = await findRow(strapi, created.documentId, 'en', 'published');

    await strapi.documents(uid).publish({ documentId: created.documentId, locale: 'fr' });

    expect(await findRow(strapi, created.documentId, 'fr', 'published')).toBeTruthy();
    expectUnchanged(await findRow(strapi, created.documentId, 'en', 'published'), before);
  });

  test('still copies a changed shared value from a new locale to the other locales', async () => {
    const created = await strapi.documents(uid).create({
      locale: 'en',
      data: { title: 'en', code: 'same', seo: { metaTitle: 'same' } },
    });

    await strapi.documents(uid).update({
      documentId: created.documentId,
      locale: 'fr',
      data: { title: 'fr', code: 'changed', seo: { metaTitle: 'same' } },
    });

    const english = await findRow(strapi, created.documentId, 'en', 'draft');
    expect(english.code).toBe('changed');
  });
});
