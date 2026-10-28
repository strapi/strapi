import type { Core, Modules, Struct } from '@strapi/types';
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

const draftAndPublishArticle = {
  ...article,
  options: { draftAndPublish: true },
  attributes: {
    shared: { type: 'string' },
  },
} satisfies Struct.CollectionTypeSchema;

const registerProvider = (
  localization: Modules.Localization.Service,
  provider: Partial<Modules.Localization.Provider> &
    Pick<Modules.Localization.Provider, 'fillNonLocalizedAttributes'>
) => {
  localization.register({
    isLocalizedContentType: () => true,
    getDefaultLocale: async () => 'en',
    getLocales: async () => [],
    getNestedPopulateOfNonLocalizedAttributes: () => [],
    getNonLocalizedAttributes: () => [],
    ...provider,
  });
};

describe('Document localization capability', () => {
  const query = jest.fn();
  let localization: Modules.Localization.Service;

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
      getLocales: async () => [],
      getNestedPopulateOfNonLocalizedAttributes: () => [],
      getNonLocalizedAttributes: () => [],
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

  it('copies nonlocalized media from the default locale as IDs without mutating the input', async () => {
    registerProvider(localization, {
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
      where: { documentId: 'article-1', locale: 'en' },
      populate: ['cover'],
    });
  });

  it('copies from the default-locale draft explicitly', async () => {
    registerProvider(localization, {
      fillNonLocalizedAttributes(entry, relatedEntry) {
        entry.shared = relatedEntry.shared;
      },
    });
    const findOne = jest.fn(async () => ({
      documentId: 'doc-1',
      locale: 'en',
      publishedAt: null,
      shared: 'draft-value',
    }));
    query.mockReturnValue({ findOne });

    const result = await copyNonLocalizedFields(draftAndPublishArticle, 'doc-1', {
      localized: 'fr',
    });

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-1',
        locale: 'en',
        publishedAt: { $null: true },
      },
      populate: [],
    });
    expect(result).toEqual({ localized: 'fr', shared: 'draft-value' });
  });

  it('falls back to another draft when the default locale does not exist', async () => {
    registerProvider(localization, {
      fillNonLocalizedAttributes(entry, relatedEntry) {
        entry.shared = relatedEntry.shared;
      },
    });
    const findOne = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ shared: 'sibling-value' });
    query.mockReturnValue({ findOne });

    const result = await copyNonLocalizedFields(draftAndPublishArticle, 'doc-1', {});

    expect(findOne).toHaveBeenNthCalledWith(2, {
      where: {
        documentId: 'doc-1',
        publishedAt: { $null: true },
      },
      populate: [],
    });
    expect(result.shared).toBe('sibling-value');
  });

  it('copies from the default-locale published sibling when writing published', async () => {
    registerProvider(localization, {
      fillNonLocalizedAttributes(entry, relatedEntry) {
        entry.shared = relatedEntry.shared;
      },
    });
    const findOne = jest.fn(async () => ({ shared: 'published-value' }));
    query.mockReturnValue({ findOne });

    const result = await copyNonLocalizedFields(
      draftAndPublishArticle,
      'doc-1',
      { localized: 'fr' },
      { status: 'published' }
    );

    expect(findOne).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-1',
        locale: 'en',
        publishedAt: { $ne: null },
      },
      populate: [],
    });
    expect(result.shared).toBe('published-value');
  });

  it('replaces present shared fields from the published sibling', async () => {
    const fillNonLocalizedAttributes = jest.fn((entry, relatedEntry) => {
      entry.shared = relatedEntry.shared;
    });
    registerProvider(localization, { fillNonLocalizedAttributes });
    const findOne = jest.fn(async () => ({ shared: 'published-value' }));
    query.mockReturnValue({ findOne });

    const result = await copyNonLocalizedFields(
      draftAndPublishArticle,
      'doc-1',
      { localized: 'fr', shared: 'draft-value' },
      { status: 'published', strategy: 'replace' }
    );

    expect(fillNonLocalizedAttributes).toHaveBeenCalled();
    expect(result).toEqual({ localized: 'fr', shared: 'published-value' });
  });
});
