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

const englishDraft = (strapi, documentId) =>
  strapi.db.query(uid).findOne({
    where: { documentId, locale: 'en', publishedAt: null },
    populate: { seo: true },
  });

describe('creating a locale keeps sibling drafts', () => {
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

  test('leaves the published locale updatedAt, status and component id unchanged', async () => {
    const created = await strapi.documents(uid).create({
      locale: 'en',
      data: { title: 'en', code: 'same', seo: { metaTitle: 'same' } },
      status: 'published',
    });

    const before = await englishDraft(strapi, created.documentId);
    expect(before.seo.id).toEqual(expect.any(Number));

    await strapi.documents(uid).update({
      documentId: created.documentId,
      locale: 'fr',
      data: { title: 'fr', code: 'same', seo: { metaTitle: 'same' } },
    });

    const after = await englishDraft(strapi, created.documentId);
    const published = await strapi.db.query(uid).findOne({
      where: { documentId: created.documentId, locale: 'en', publishedAt: { $ne: null } },
    });

    expect(new Date(after.updatedAt).getTime()).toBe(new Date(before.updatedAt).getTime());
    expect(after.seo.id).toBe(before.seo.id);
    expect(published).toBeTruthy();
    expect(new Date(after.updatedAt).getTime()).toBeLessThanOrEqual(
      new Date(published.updatedAt).getTime()
    );
  });
});
