import type { Core, Struct } from '@strapi/types';
import { createLocalizationService } from '../../localization';
import {
  copyNonLocalizedFields,
  defaultLocale,
  localeToData,
  localeToLookup,
  multiLocaleToLookup,
} from '../internationalization';

const article = {
  uid: 'api::article.article',
  modelType: 'contentType',
  modelName: 'article',
  globalId: 'Article',
  kind: 'collectionType',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  attributes: {
    title: { type: 'string' },
    cover: { type: 'media', multiple: false },
  },
} satisfies Struct.CollectionTypeSchema;

describe('Document localization capability', () => {
  const query = jest.fn();
  let localization: Core.Localization;

  beforeEach(() => {
    localization = createLocalizationService();
    global.strapi = { localization, db: { query } } as unknown as Core.Strapi;
    query.mockReset();
  });

  it('keeps documents unchanged without a localization provider', async () => {
    const params = { data: { title: 'Hello' } };
    expect(await defaultLocale(article, params)).toBe(params);
    expect(localeToLookup(article, params)).toBe(params);
    expect(multiLocaleToLookup(article, params)).toBe(params);
    expect(localeToData(article, params)).toBe(params);
    expect(await copyNonLocalizedFields(article, 'article-1', params.data)).toBe(params.data);
    expect(query).not.toHaveBeenCalled();
  });

  it('uses the registered default locale for document lookups and writes', async () => {
    localization.register({
      isLocalizedContentType: () => true,
      getDefaultLocale: async () => 'fr',
      getNestedPopulateOfNonLocalizedAttributes: () => [],
      fillNonLocalizedAttributes() {},
    });

    const params = await defaultLocale(article, { data: { title: 'Bonjour' } });
    expect(params.locale).toBe('fr');
    expect(localeToLookup(article, params)).toMatchObject({ lookup: { locale: 'fr' } });
    expect(localeToData(article, params)).toMatchObject({ data: { locale: 'fr' } });
    expect(multiLocaleToLookup(article, { locale: ['en', 'fr'] })).toEqual({
      locale: ['en', 'fr'],
      lookup: { locale: ['en', 'fr'] },
    });
  });

  it('copies nonlocalized media from an existing locale as IDs without mutating the input', async () => {
    localization.register({
      isLocalizedContentType: () => true,
      getDefaultLocale: async () => 'en',
      getNestedPopulateOfNonLocalizedAttributes: () => ['cover'],
      fillNonLocalizedAttributes(entry, relatedEntry) {
        entry.cover = relatedEntry.cover;
      },
    });
    const findOne = jest.fn(async () => ({ title: 'Hello', cover: { id: 12 } }));
    query.mockReturnValue({ findOne });
    const input = { title: 'Bonjour' };

    await expect(copyNonLocalizedFields(article, 'article-1', input)).resolves.toEqual({
      title: 'Bonjour',
      cover: 12,
    });
    expect(input).toEqual({ title: 'Bonjour' });
    expect(query).toHaveBeenCalledWith(article.uid);
    expect(findOne).toHaveBeenCalledWith({
      where: { documentId: 'article-1' },
      orderBy: { publishedAt: 'desc' },
      populate: ['cover'],
    });
  });
});
