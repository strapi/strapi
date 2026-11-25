import type { Core, Schema } from '@strapi/types';
import createSanitizeService from '../index';

jest.mock('../../../utils', () => ({
  getService: () => ({
    isLocalizedContentType: (schema: { pluginOptions?: { i18n?: { localized?: boolean } } }) =>
      schema.pluginOptions?.i18n?.localized === true,
  }),
}));

describe('localization field sanitizer', () => {
  const schema = {
    uid: 'api::article.article',
    modelType: 'contentType',
    modelName: 'article',
    globalId: 'Article',
    kind: 'collectionType',
    info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
    attributes: {
      title: { type: 'string' },
      locale: { type: 'string' },
      localizations: { type: 'json' },
    },
  } satisfies Schema.Schema;
  const strapi = { getModel: jest.fn() } as unknown as Core.Strapi;

  it('supports direct and curried calls without modifying the entity', async () => {
    const { sanitizeLocalizationFields } = createSanitizeService({ strapi });
    const entity = Object.freeze({ id: 1, title: 'Article', locale: 'en', localizations: [] });

    await expect(sanitizeLocalizationFields(schema, entity)).resolves.toEqual({
      id: 1,
      title: 'Article',
    });
    await expect(sanitizeLocalizationFields(schema)(entity)).resolves.toEqual({
      id: 1,
      title: 'Article',
    });
    expect(entity.locale).toBe('en');
  });

  it('retains localization fields on localized schemas', async () => {
    const { sanitizeLocalizationFields } = createSanitizeService({ strapi });
    const localizedSchema = { ...schema, pluginOptions: { i18n: { localized: true } } };
    const entity = { id: 1, title: 'Article', locale: 'en', localizations: [] };

    await expect(sanitizeLocalizationFields(localizedSchema)(entity)).resolves.toEqual(entity);
  });
});
