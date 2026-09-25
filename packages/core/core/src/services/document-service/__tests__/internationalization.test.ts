import { copyNonLocalizedFields } from '../internationalization';

describe('document service internationalization', () => {
  describe('copyNonLocalizedFields', () => {
    it('copies from the default-locale draft explicitly', async () => {
      const defaultDraft = {
        documentId: 'doc-1',
        locale: 'en',
        publishedAt: null,
        shared: 'draft-value',
      };
      const findOne = jest.fn().mockResolvedValue(defaultDraft);
      const fillNonLocalizedAttributes = jest.fn((entry, relatedEntry) => {
        entry.shared = relatedEntry.shared;
      });

      global.strapi = {
        plugin: (name: string) => (global.strapi as any).plugins[name],
        plugins: {
          i18n: {
            services: {
              locales: { getDefaultLocale: jest.fn().mockResolvedValue('en') },
              'content-types': {
                isLocalizedContentType: () => true,
                getNestedPopulateOfNonLocalizedAttributes: () => [],
                fillNonLocalizedAttributes,
              },
            },
            controllers: {},
            contentTypes: {},
            policies: {},
          },
        },
        apis: {},
        db: {
          query: () => ({ findOne }),
        },
      } as any;

      const result = await copyNonLocalizedFields(
        {
          uid: 'api::article.article',
          options: { draftAndPublish: true },
          attributes: {
            shared: { type: 'string' },
          },
        } as any,
        'doc-1',
        { localized: 'fr' }
      );

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
      const siblingDraft = {
        documentId: 'doc-1',
        locale: 'de',
        publishedAt: null,
        shared: 'sibling-value',
      };
      const findOne = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(siblingDraft);

      global.strapi = {
        plugin: (name: string) => (global.strapi as any).plugins[name],
        plugins: {
          i18n: {
            services: {
              locales: { getDefaultLocale: jest.fn().mockResolvedValue('en') },
              'content-types': {
                isLocalizedContentType: () => true,
                getNestedPopulateOfNonLocalizedAttributes: () => [],
                fillNonLocalizedAttributes(entry: Record<string, unknown>, relatedEntry: any) {
                  entry.shared = relatedEntry.shared;
                },
              },
            },
            controllers: {},
            contentTypes: {},
            policies: {},
          },
        },
        apis: {},
        db: {
          query: () => ({ findOne }),
        },
      } as any;

      const result = await copyNonLocalizedFields(
        {
          uid: 'api::article.article',
          options: { draftAndPublish: true },
          attributes: {
            shared: { type: 'string' },
          },
        } as any,
        'doc-1',
        {}
      );

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
      const defaultPublished = {
        documentId: 'doc-1',
        locale: 'en',
        publishedAt: '2026-01-01',
        shared: 'published-value',
      };
      const findOne = jest.fn().mockResolvedValue(defaultPublished);
      const fillNonLocalizedAttributes = jest.fn((entry, relatedEntry) => {
        entry.shared = relatedEntry.shared;
      });

      global.strapi = {
        plugin: (name: string) => (global.strapi as any).plugins[name],
        plugins: {
          i18n: {
            services: {
              locales: { getDefaultLocale: jest.fn().mockResolvedValue('en') },
              'content-types': {
                isLocalizedContentType: () => true,
                getNestedPopulateOfNonLocalizedAttributes: () => [],
                fillNonLocalizedAttributes,
              },
            },
            controllers: {},
            contentTypes: {},
            policies: {},
          },
        },
        apis: {},
        db: {
          query: () => ({ findOne }),
        },
      } as any;

      const result = await copyNonLocalizedFields(
        {
          uid: 'api::article.article',
          options: { draftAndPublish: true },
          attributes: {
            shared: { type: 'string' },
          },
        } as any,
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
      const defaultPublished = {
        documentId: 'doc-1',
        locale: 'en',
        publishedAt: '2026-01-01',
        shared: 'published-value',
      };
      const findOne = jest.fn().mockResolvedValue(defaultPublished);

      global.strapi = {
        plugin: (name: string) => (global.strapi as any).plugins[name],
        plugins: {
          i18n: {
            services: {
              locales: { getDefaultLocale: jest.fn().mockResolvedValue('en') },
              'content-types': {
                isLocalizedContentType: () => true,
                getNestedPopulateOfNonLocalizedAttributes: () => [],
                copyNonLocalizedAttributes: (_schema: unknown, entry: { shared: string }) => ({
                  shared: entry.shared,
                }),
                fillNonLocalizedAttributes: jest.fn(),
              },
            },
            controllers: {},
            contentTypes: {},
            policies: {},
          },
        },
        apis: {},
        db: {
          query: () => ({ findOne }),
        },
      } as any;

      const fillNonLocalizedAttributes = (global.strapi as any).plugins.i18n.services[
        'content-types'
      ].fillNonLocalizedAttributes;

      const result = await copyNonLocalizedFields(
        {
          uid: 'api::article.article',
          options: { draftAndPublish: true },
          attributes: {
            shared: { type: 'string' },
          },
        } as any,
        'doc-1',
        { localized: 'fr', shared: 'draft-value' },
        { status: 'published', strategy: 'replace' }
      );

      expect(fillNonLocalizedAttributes).not.toHaveBeenCalled();
      expect(result).toEqual({ localized: 'fr', shared: 'published-value' });
    });
  });
});
