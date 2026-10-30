'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const client = process.env.DATABASE_CLIENT ?? 'sqlite';
const describeMysql = client === 'mysql' || client === 'mysql2' ? describe : describe.skip;

const ARTICLE_UID = 'api::link-article.link-article';
const CATEGORY_UID = 'api::link-category.link-category';

const categoryModel = {
  attributes: {
    name: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
  },
  draftAndPublish: true,
  displayName: 'Link category',
  singularName: 'link-category',
  pluralName: 'link-categories',
  pluginOptions: { i18n: { localized: true } },
};

const articleModel = {
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: CATEGORY_UID,
      targetAttribute: 'articles',
    },
  },
  draftAndPublish: true,
  displayName: 'Link article',
  singularName: 'link-article',
  pluralName: 'link-articles',
  pluginOptions: { i18n: { localized: true } },
};

const builder = createTestBuilder();

describeMysql('MySQL cross-locale relation connects', () => {
  let strapi;

  beforeAll(async () => {
    await builder.addContentType(categoryModel).addContentType(articleModel).build();
    strapi = await createStrapiInstance();
    await strapi.plugin('i18n').service('locales').create({ code: 'fr', name: 'French' });
  }, 120000);

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('concurrent cross-locale connects both succeed', async () => {
    const article = await strapi.documents(ARTICLE_UID).create({
      locale: 'en',
      data: { title: 'article-en' },
    });
    const category = await strapi.documents(CATEGORY_UID).create({
      locale: 'en',
      data: { name: 'category-en' },
    });

    await strapi.documents(ARTICLE_UID).update({
      documentId: article.documentId,
      locale: 'fr',
      data: { title: 'article-fr' },
    });
    await strapi.documents(CATEGORY_UID).update({
      documentId: category.documentId,
      locale: 'fr',
      data: { name: 'category-fr' },
    });

    for (let round = 0; round < 8; round += 1) {
      const results = await Promise.all([
        strapi.documents(ARTICLE_UID).update({
          documentId: article.documentId,
          locale: 'en',
          data: {
            categories: { connect: [{ documentId: category.documentId, locale: 'en' }] },
          },
        }),
        strapi.documents(CATEGORY_UID).update({
          documentId: category.documentId,
          locale: 'fr',
          data: {
            articles: { connect: [{ documentId: article.documentId, locale: 'fr' }] },
          },
        }),
      ]);

      expect(results[0]).toBeTruthy();
      expect(results[1]).toBeTruthy();
    }
  });
});
