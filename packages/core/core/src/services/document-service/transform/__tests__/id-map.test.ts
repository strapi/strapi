import { Core } from '@strapi/types';
import { createIdMap } from '../id-map';

const ARTICLE_UID = 'api::article.article';
const CATEGORY_UID = 'api::category.category';

const expectedQuery = (documentId: string, locale: string, status = 'draft') => ({
  select: ['id', 'documentId', 'locale', 'publishedAt'],
  where: {
    documentId: { $in: [documentId] },
    locale,
    publishedAt: status === 'draft' ? null : { $ne: null },
  },
});

describe('Extract document ids from relation data', () => {
  const findArticles = jest.fn(() => ({}));
  const findCategories = jest.fn(() => ({}));

  const findManyQueries = {
    [ARTICLE_UID]: findArticles,
    [CATEGORY_UID]: findCategories,
  } as Record<string, jest.Mock>;

  beforeAll(() => {
    global.strapi = {
      db: {
        query: jest.fn((uid) => ({ findMany: findManyQueries[uid] })),
      },
    } as unknown as Core.Strapi;
  });

  it('Load single document id', async () => {
    const idMap = createIdMap({ strapi: global.strapi });

    const documentId = 'Article1';
    const locale = 'en';
    const status = 'published';

    findArticles.mockReturnValueOnce([{ id: 1, documentId, locale, publishedAt: '27-11-2024' }]);

    // Add 1 document to load
    idMap.add({ uid: ARTICLE_UID, documentId, locale, status });
    await idMap.load();

    // Check that the id is loaded
    expect(idMap.get({ uid: ARTICLE_UID, documentId, locale, status })).toEqual(1);
    expect(findArticles).toHaveBeenCalledWith(expectedQuery(documentId, locale, status));
  });

  it('Load with no locale', async () => {
    const idMap = createIdMap({ strapi: global.strapi });

    const documentId = 'Article1';
    const keyFields = { uid: ARTICLE_UID, documentId, status: 'draft', locale: null } as const;
    findArticles.mockReturnValueOnce([{ id: 1, documentId, locale: null, publishedAt: undefined }]);

    // Add 1 document to load
    idMap.add(keyFields);
    await idMap.load();

    // Check that the id is loaded
    expect(idMap.get(keyFields)).toEqual(1);
  });

  it('Load multiple document ids from different UIDs', async () => {
    const idMap = createIdMap({ strapi: global.strapi });

    const articleDocumentId = 'Article1';
    const categoryDocumentId = 'Category1';
    const locale = 'en';
    const status = 'draft';

    findArticles.mockReturnValueOnce([
      { id: 1, documentId: articleDocumentId, locale, publishedAt: '27-11-2024' },
    ]);
    findCategories.mockReturnValueOnce([
      { id: 2, documentId: categoryDocumentId, locale, publishedAt: '27-11-2024' },
    ]);

    // Add 2 documents to load
    idMap.add({ uid: ARTICLE_UID, documentId: articleDocumentId, locale, status });
    idMap.add({ uid: CATEGORY_UID, documentId: categoryDocumentId, locale, status });
    // Should load articles and categories separately
    await idMap.load();

    // Check that the ids are loaded
    expect(idMap.get({ uid: ARTICLE_UID, documentId: articleDocumentId, locale })).toEqual(1);
    expect(idMap.get({ uid: CATEGORY_UID, documentId: categoryDocumentId, locale })).toEqual(2);

    expect(findArticles).toHaveBeenCalledWith(expectedQuery(articleDocumentId, locale));
    expect(findCategories).toHaveBeenCalledWith(expectedQuery(categoryDocumentId, locale));
  });

  it('Load different locales of the same document id', async () => {
    const idMap = createIdMap({ strapi: global.strapi });

    const documentId = 'Article1';
    const enLocale = 'en';
    const frLocale = 'fr';
    const status = 'draft';

    findArticles
      .mockReturnValueOnce([{ id: 1, documentId, locale: enLocale, publishedAt: null }])
      .mockReturnValueOnce([{ id: 2, documentId, locale: frLocale, publishedAt: null }]);

    // Add 2 documents to load
    idMap.add({ uid: ARTICLE_UID, documentId, locale: enLocale, status });
    idMap.add({ uid: ARTICLE_UID, documentId, locale: frLocale, status });
    await idMap.load();

    // Check that the ids are loaded
    expect(idMap.get({ uid: ARTICLE_UID, documentId, locale: enLocale, status })).toEqual(1);
    expect(idMap.get({ uid: ARTICLE_UID, documentId, locale: frLocale, status })).toEqual(2);

    expect(findArticles).toHaveBeenCalledWith(expectedQuery(documentId, enLocale, status));
    expect(findArticles).toHaveBeenCalledWith(expectedQuery(documentId, frLocale, status));
  });
});
