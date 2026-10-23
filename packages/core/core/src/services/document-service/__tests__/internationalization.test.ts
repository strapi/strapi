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

  it('copies nonlocalized media from an existing locale as IDs without mutating the input', async () => {
    localization.register({
      isLocalizedContentType: () => true,
      getDefaultLocale: async () => 'en',
      getLocales: async () => [],
      getNestedPopulateOfNonLocalizedAttributes: () => ['cover'],
      getNonLocalizedAttributes: () => [],
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

  it('normalizes media inside components and dynamic zones without mutating the input', async () => {
    const seo = {
      uid: 'shared.seo',
      modelType: 'component',
      modelName: 'seo',
      globalId: 'ComponentSharedSeo',
      category: 'shared',
      info: { displayName: 'Seo' },
      attributes: {
        image: { type: 'media', multiple: false },
        gallery: { type: 'media', multiple: true },
      },
    } satisfies Struct.ComponentSchema;
    const page = {
      ...article,
      attributes: {
        title: { type: 'string' },
        seo: { type: 'component', component: 'shared.seo', repeatable: false },
        seos: { type: 'component', component: 'shared.seo', repeatable: true },
        blocks: { type: 'dynamiczone', components: ['shared.seo'] },
      },
    } satisfies Struct.CollectionTypeSchema;

    global.strapi = {
      localization,
      db: { query },
      getModel: () => seo,
    } as unknown as Core.Strapi;
    localization.register({
      isLocalizedContentType: () => true,
      getDefaultLocale: async () => 'en',
      getLocales: async () => [],
      getNestedPopulateOfNonLocalizedAttributes: () => [],
      getNonLocalizedAttributes: () => [],
      fillNonLocalizedAttributes() {},
    });
    query.mockReturnValue({ findOne: jest.fn(async () => ({ title: 'Hello' })) });

    const deepFreeze = <T>(value: T): T => {
      if (value && typeof value === 'object') {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
      }
      return value;
    };
    const component = { image: { id: 1 }, gallery: [{ id: 2 }, 3] };
    const input = deepFreeze({
      title: 'Bonjour',
      seo: component,
      seos: [component],
      blocks: [{ __component: 'shared.seo', ...component }],
    });
    const snapshot = structuredClone(input);

    const normalized = { image: 1, gallery: [2, 3] };
    await expect(copyNonLocalizedFields(page, 'page-1', input)).resolves.toEqual({
      title: 'Bonjour',
      seo: normalized,
      seos: [normalized],
      blocks: [{ __component: 'shared.seo', ...normalized }],
    });
    expect(input).toEqual(snapshot);
  });
});
