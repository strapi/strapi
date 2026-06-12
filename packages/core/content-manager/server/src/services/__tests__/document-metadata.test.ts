import documentMetadataServiceFactory from '../document-metadata';

const createService = (overrides: Record<string, unknown> = {}) => {
  const strapi = {
    getModel: () => ({
      uid: 'api::article.article',
      options: {},
      pluginOptions: { i18n: { localized: true } },
      attributes: {},
    }),
    plugin: () => ({
      service: () => ({
        getDefaultLocale: async () => 'en',
      }),
    }),
    ...overrides,
  } as unknown as Parameters<typeof documentMetadataServiceFactory>[0]['strapi'];

  return documentMetadataServiceFactory({ strapi });
};

describe('document-metadata service', () => {
  describe('getAvailableLocales', () => {
    /**
     * Regression guard for CMS-540. The admin's
     * `useDocument.getInitialFormValues` inherits non-localized scalar/media
     * values from `meta.availableLocales[0]` when creating a new locale draft.
     * That selection is only meaningful if the default locale sits first —
     * otherwise drift between siblings (caused by `copyNonLocalizedFields` only
     * syncing at locale-creation time) can surface stale values to the user.
     */
    it('places the default locale first in the result', async () => {
      const service = createService();

      const result = await service.getAvailableLocales(
        'api::article.article',
        // current locale (excluded from the result)
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'fr' },
          { id: 3, documentId: 'doc-1', locale: 'en' },
          { id: 4, documentId: 'doc-1', locale: 'de' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['en', 'fr', 'de']);
    });

    it('preserves the original order of non-default locales', async () => {
      const service = createService();

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'de' },
          { id: 3, documentId: 'doc-1', locale: 'fr' },
          { id: 4, documentId: 'doc-1', locale: 'en' },
          { id: 5, documentId: 'doc-1', locale: 'es' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['en', 'de', 'fr', 'es']);
    });

    it('returns the result untouched if the default locale is not in the available locales', async () => {
      const service = createService();

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'fr' },
          { id: 3, documentId: 'doc-1', locale: 'de' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['fr', 'de']);
    });

    it('no-ops when the i18n plugin is unavailable', async () => {
      const service = createService({
        plugin: () => undefined,
      });

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'fr' },
          { id: 3, documentId: 'doc-1', locale: 'en' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['fr', 'en']);
    });

    it('no-ops when getDefaultLocale throws', async () => {
      const service = createService({
        plugin: () => ({
          service: () => ({
            async getDefaultLocale() {
              throw new Error('boom');
            },
          }),
        }),
      });

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'fr' },
          { id: 3, documentId: 'doc-1', locale: 'en' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['fr', 'en']);
    });

    it('excludes the current locale from the result', async () => {
      const service = createService();

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'en' },
        [
          { id: 1, documentId: 'doc-1', locale: 'en' },
          { id: 2, documentId: 'doc-1', locale: 'fr' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['fr']);
    });
  });
});
