import type { Core, Struct } from '@strapi/types';
import { createLocalizationService } from '../localization';

const article = {
  uid: 'api::article.article',
  modelType: 'contentType',
  modelName: 'article',
  globalId: 'Article',
  kind: 'collectionType',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  attributes: {},
} satisfies Struct.ContentTypeSchema;

describe('Localization capability', () => {
  it('leaves content untouched when no provider is registered', async () => {
    const localization = createLocalizationService();
    const entry = { title: 'Bonjour' };

    expect(localization.isEnabled()).toBe(false);
    expect(localization.isLocalizedContentType(article)).toBe(false);
    await expect(localization.getDefaultLocale()).resolves.toBeNull();
    await expect(localization.getLocales()).resolves.toEqual([]);
    expect(localization.getNestedPopulateOfNonLocalizedAttributes(article.uid)).toEqual([]);
    expect(localization.getNonLocalizedAttributes(article)).toEqual([]);

    localization.fillNonLocalizedAttributes(entry, { slug: 'hello' }, { model: article.uid });
    expect(entry).toEqual({ title: 'Bonjour' });
  });

  it('delegates to the registered provider and keeps registration per application', async () => {
    const localization = createLocalizationService();
    const otherApplication = createLocalizationService();
    const provider = {
      isLocalizedContentType: jest.fn(() => true),
      getDefaultLocale: jest.fn(async () => 'en'),
      getLocales: jest.fn(async () => [{ code: 'en', name: 'English (en)' }]),
      getNestedPopulateOfNonLocalizedAttributes: jest.fn(() => ['cover']),
      getNonLocalizedAttributes: jest.fn(() => ['slug']),
      fillNonLocalizedAttributes: jest.fn((entry, relatedEntry) => {
        entry.cover = relatedEntry.cover;
      }),
    } satisfies Core.LocalizationProvider;

    localization.register(provider);

    expect(localization.isEnabled()).toBe(true);
    expect(localization.isLocalizedContentType(article)).toBe(true);
    expect(provider.isLocalizedContentType).toHaveBeenCalledWith(article);
    await expect(localization.getDefaultLocale()).resolves.toBe('en');
    await expect(localization.getLocales()).resolves.toEqual([
      { code: 'en', name: 'English (en)' },
    ]);
    expect(localization.getNestedPopulateOfNonLocalizedAttributes(article.uid)).toEqual(['cover']);
    expect(provider.getNestedPopulateOfNonLocalizedAttributes).toHaveBeenCalledWith(article.uid);
    expect(localization.getNonLocalizedAttributes(article)).toEqual(['slug']);
    expect(provider.getNonLocalizedAttributes).toHaveBeenCalledWith(article);

    const entry = { title: 'Bonjour' };
    const relatedEntry = { cover: { id: 12 } };
    localization.fillNonLocalizedAttributes(entry, relatedEntry, { model: article.uid });
    expect(provider.fillNonLocalizedAttributes).toHaveBeenCalledWith(entry, relatedEntry, {
      model: article.uid,
    });
    expect(entry).toEqual({ title: 'Bonjour', cover: { id: 12 } });

    expect(otherApplication.isEnabled()).toBe(false);
    expect(otherApplication.isLocalizedContentType(article)).toBe(false);
    await expect(otherApplication.getDefaultLocale()).resolves.toBeNull();
  });

  it('preserves provider failures instead of treating them as missing localization', async () => {
    const localization = createLocalizationService();
    localization.register({
      isLocalizedContentType: () => true,
      async getDefaultLocale() {
        throw new Error('Locale store unavailable');
      },
      getLocales: async () => [],
      getNestedPopulateOfNonLocalizedAttributes: () => [],
      getNonLocalizedAttributes: () => [],
      fillNonLocalizedAttributes() {},
    });

    await expect(localization.getDefaultLocale()).rejects.toThrow('Locale store unavailable');
  });
});
