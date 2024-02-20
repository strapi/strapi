import { LoadedStrapi } from '@strapi/types';
import { createIdMap } from '../id-map';

const ARTICLE_UID = 'api::article.article';
const CATEGORY_UID = 'api::category.category';

const expectedQuery = (documentId: string, locale: string, isDraft = false) => ({
  select: ['id', 'documentId', 'locale', 'publishedAt'],
  where: {
    documentId: { $in: [documentId] },
    locale,
    publishedAt: isDraft ? null : { $ne: null },
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
    } as unknown as LoadedStrapi;
  });

  it('Load single document id', async () => {
    const idMap = createIdMap({ strapi: global.strapi });

    const documentId = 'Article1';
    const locale = 'en';
    const isDraft = false;

    findArticles.mockReturnValueOnce([{ id: 1, documentId, locale, publishedAt: '27-11-2024' }]);

    // Add 1 document to load
    idMap.add({ uid: ARTICLE_UID, documentId, locale, isDraft });
    await idMap.load();

    // Check that the id is loaded
    expect(idMap.get({ uid: ARTICLE_UID, documentId, locale, isDraft })).toEqual(1);
    expect(findArticles).toHaveBeenCalledWith(expectedQuery(documentId, locale, isDraft));
  });

  it('Load with no locale', async () => {
    const idMap = createIdMap({ strapi: global.strapi });

    const documentId = 'Article1';
    const keyFields = { uid: ARTICLE_UID, documentId, isDraft: true, locale: null };
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
    const isDraft = false;

    findArticles.mockReturnValueOnce([
      { id: 1, documentId: articleDocumentId, locale, publishedAt: '27-11-2024' },
    ]);
    findCategories.mockReturnValueOnce([
      { id: 2, documentId: categoryDocumentId, locale, publishedAt: '27-11-2024' },
    ]);

    // Add 2 documents to load
    idMap.add({ uid: ARTICLE_UID, documentId: articleDocumentId, locale, isDraft });
    idMap.add({ uid: CATEGORY_UID, documentId: categoryDocumentId, locale, isDraft });
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
    const isDraft = true;

    findArticles
      .mockReturnValueOnce([{ id: 1, documentId, locale: enLocale, publishedAt: null }])
      .mockReturnValueOnce([{ id: 2, documentId, locale: frLocale, publishedAt: null }]);

    // Add 2 documents to load
    idMap.add({ uid: ARTICLE_UID, documentId, locale: enLocale, isDraft });
    idMap.add({ uid: ARTICLE_UID, documentId, locale: frLocale, isDraft });
    await idMap.load();

    // Check that the ids are loaded
    expect(idMap.get({ uid: ARTICLE_UID, documentId, locale: enLocale, isDraft })).toEqual(1);
    expect(idMap.get({ uid: ARTICLE_UID, documentId, locale: frLocale, isDraft })).toEqual(2);

    expect(findArticles).toHaveBeenCalledWith(expectedQuery(documentId, enLocale, isDraft));
    expect(findArticles).toHaveBeenCalledWith(expectedQuery(documentId, frLocale, isDraft));
  });
});
