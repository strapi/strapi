'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const client = process.env.DATABASE_CLIENT ?? 'sqlite';
const describeMysql = client === 'mysql' || client === 'mysql2' ? describe : describe.skip;

const ARTICLE_UID = 'api::parallel-locale-article.parallel-locale-article';
const locales = ['fr', 'de', 'es', 'it', 'nl', 'pt', 'sv', 'pl'];

const articleModel = {
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
  },
  draftAndPublish: true,
  displayName: 'Parallel locale article',
  singularName: 'parallel-locale-article',
  pluralName: 'parallel-locale-articles',
  pluginOptions: { i18n: { localized: true } },
};

const builder = createTestBuilder();

describeMysql('MySQL document updates for new locales', () => {
  let strapi;

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();
    strapi = await createStrapiInstance();

    for (const code of locales) {
      await strapi.plugin('i18n').service('locales').create({ code, name: code });
    }
  }, 120000);

  afterAll(async () => {
    if (strapi) {
      await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
      await strapi.destroy();
    }
    await builder.cleanup();
  });

  test('creates more new locales in parallel than the transaction retry budget', async () => {
    const article = await strapi.documents(ARTICLE_UID).create({
      locale: 'en',
      data: { title: 'English article' },
    });

    const results = await Promise.all(
      locales.map((locale) =>
        strapi.documents(ARTICLE_UID).update({
          documentId: article.documentId,
          locale,
          data: { title: `${locale} article` },
        })
      )
    );

    expect(results).toHaveLength(locales.length);
    expect(results.every(Boolean)).toBe(true);

    const entries = await strapi.db.query(ARTICLE_UID).findMany({
      where: { documentId: article.documentId },
    });

    expect(entries.map((entry) => entry.locale).sort()).toEqual([
      'de',
      'en',
      'es',
      'fr',
      'it',
      'nl',
      'pl',
      'pt',
      'sv',
    ]);
  });
});
