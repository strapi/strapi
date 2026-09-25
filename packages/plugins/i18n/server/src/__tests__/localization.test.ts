import type { Core, Struct } from '@strapi/types';
import { createLocalizationProvider } from '../localization';

const article = {
  uid: 'api::article.article',
  modelType: 'contentType',
  modelName: 'article',
  globalId: 'Article',
  kind: 'collectionType',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  attributes: {},
} satisfies Struct.ContentTypeSchema;

it('resolves services lazily on the injected Strapi instance', async () => {
  const contentTypes = {
    isLocalizedContentType: jest.fn(() => true),
    getNestedPopulateOfNonLocalizedAttributes: jest.fn(() => ['cover']),
    getNonLocalizedAttributes: jest.fn(() => ['slug']),
    fillNonLocalizedAttributes: jest.fn(),
  };
  const locales = {
    getDefaultLocale: jest.fn(async () => 'en'),
    find: jest.fn(async () => [
      { id: 1, documentId: 'abc', code: 'en', name: 'English (en)', isDefault: true },
    ]),
  };
  const service = jest.fn((name: string) => (name === 'locales' ? locales : contentTypes));
  const plugin = jest.fn(() => ({ service }));
  const strapi = { plugin } as unknown as Core.Strapi;

  const provider = createLocalizationProvider(strapi);
  expect(plugin).not.toHaveBeenCalled();
  expect(service).not.toHaveBeenCalled();

  expect(provider.isLocalizedContentType(article)).toBe(true);
  expect(contentTypes.isLocalizedContentType).toHaveBeenCalledWith(article);
  await expect(provider.getDefaultLocale()).resolves.toBe('en');
  expect(provider.getNestedPopulateOfNonLocalizedAttributes(article.uid)).toEqual(['cover']);
  expect(contentTypes.getNestedPopulateOfNonLocalizedAttributes).toHaveBeenCalledWith(article.uid);
  expect(provider.getNonLocalizedAttributes(article)).toEqual(['slug']);
  expect(contentTypes.getNonLocalizedAttributes).toHaveBeenCalledWith(article);
  await expect(provider.getLocales()).resolves.toEqual([{ code: 'en', name: 'English (en)' }]);

  const entry = { title: 'Bonjour' };
  const relatedEntry = { cover: { id: 12 } };
  provider.fillNonLocalizedAttributes(entry, relatedEntry, { model: article.uid });
  expect(contentTypes.fillNonLocalizedAttributes).toHaveBeenCalledWith(entry, relatedEntry, {
    model: article.uid,
  });
  expect(plugin).toHaveBeenCalledWith('i18n');

  // Service extensions installed after plugin registration must still be observed.
  const updatedLocales = { ...locales, getDefaultLocale: jest.fn(async () => 'fr') };
  service.mockReturnValueOnce(updatedLocales);
  await expect(provider.getDefaultLocale()).resolves.toBe('fr');
});

it('returns no locales when the locale store yields nothing', async () => {
  const locales = { find: jest.fn(async () => null) };
  const strapi = { plugin: () => ({ service: () => locales }) } as unknown as Core.Strapi;

  await expect(createLocalizationProvider(strapi).getLocales()).resolves.toEqual([]);
});
