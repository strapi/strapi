'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const createTranslateEntry = require('../services/translate-entry');
const adminRoutes = require('../routes/admin');

const localizedArticle = {
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  },
};

describe('translateEntry', () => {
  it('rejects incomplete or identical locales before reading content', async () => {
    const service = createTranslateEntry({ strapi: { contentTypes: {} } });

    await assert.rejects(
      () => service.translateEntry({ uid: 'api::article.article' }),
      /are required/
    );
    await assert.rejects(
      () =>
        service.translateEntry({
          uid: 'api::article.article',
          documentId: 'doc',
          sourceLocale: 'en',
          targetLocale: 'en',
        }),
      /must be different/
    );
  });

  it('rejects unknown and non-localized content types', async () => {
    const service = createTranslateEntry({
      strapi: {
        contentTypes: {
          'api::page.page': { pluginOptions: {} },
        },
      },
    });

    await assert.rejects(
      () =>
        service.translateEntry({
          uid: 'api::article.article',
          documentId: 'doc',
          sourceLocale: 'en',
          targetLocale: 'fr',
        }),
      /Unknown content type/
    );
    await assert.rejects(
      () =>
        service.translateEntry({
          uid: 'api::page.page',
          documentId: 'doc',
          sourceLocale: 'en',
          targetLocale: 'fr',
        }),
      /not localized/
    );
  });

  it('translates collected fields and updates the target locale', async () => {
    const updates = [];
    const translations = [];
    const strapi = {
      contentTypes: { 'api::article.article': localizedArticle },
      components: {},
      documents() {
        return {
          findOne: async () => ({ documentId: 'doc', title: 'Hello', locale: 'en' }),
          update: async (args) => {
            updates.push(args);
            return { documentId: args.documentId, locale: args.locale };
          },
        };
      },
      plugin() {
        return {
          service(name) {
            assert.equal(name, 'google');
            return {
              translateTexts: async (args) => {
                translations.push(args);
                return args.texts.map((text) => `${text}-fr`);
              },
            };
          },
        };
      },
    };

    const service = createTranslateEntry({ strapi });
    const result = await service.translateEntry({
      uid: 'api::article.article',
      documentId: 'doc',
      sourceLocale: 'en',
      targetLocale: 'fr',
    });

    assert.deepEqual(translations, [
      { texts: ['Hello'], sourceLocale: 'en', targetLocale: 'fr', format: 'text' },
    ]);
    assert.equal(updates[0].data.title, 'Hello-fr');
    assert.equal(result.locale, 'fr');
  });
});

describe('admin routes', () => {
  it('requires an authenticated admin on every route', () => {
    assert.equal(adminRoutes.type, 'admin');
    assert.ok(adminRoutes.routes.length > 0);
    for (const route of adminRoutes.routes) {
      assert.deepEqual(route.config.policies, ['admin::isAuthenticatedAdmin']);
    }
  });
});
