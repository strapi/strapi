import { contentTypes as strapiContentTypes } from '@strapi/utils';

import { createHomepageService } from '../homepage';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  contentTypes: {
    ...jest.requireActual('@strapi/utils').contentTypes,
    hasDraftAndPublish: jest.fn(() => false),
  },
}));

describe('homepage service', () => {
  afterEach(() => {
    jest.clearAllMocks();
    (strapiContentTypes.hasDraftAndPublish as jest.Mock).mockImplementation(() => false);
  });

  describe('queryLastDocuments', () => {
    it('deduplicates permitted content types before querying recent documents', async () => {
      const contentTypes = {
        'api::article.article': {
          uid: 'api::article.article',
          info: { displayName: 'Article' },
          kind: 'collectionType',
          options: {},
          attributes: {},
        },
        'api::page.page': {
          uid: 'api::page.page',
          info: { displayName: 'Page' },
          kind: 'collectionType',
          options: {},
          attributes: {},
        },
      };

      const findArticleDocuments = jest.fn(async () => [
        {
          documentId: 'article-1',
          title: 'Article 1',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ]);
      const findPageDocuments = jest.fn(async () => [
        {
          documentId: 'page-1',
          title: 'Page 1',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
      const findConfigurations = jest.fn(async () => [
        {
          value: JSON.stringify({
            uid: 'api::article.article',
            settings: { mainField: 'title' },
          }),
        },
        {
          value: JSON.stringify({
            uid: 'api::page.page',
            settings: { mainField: 'title' },
          }),
        },
      ]);
      const warn = jest.fn();

      const strapi = {
        admin: {
          services: {
            permission: {
              findMany: jest.fn(async () => [
                { subject: 'api::article.article' },
                { subject: 'api::article.article' },
                { subject: 'api::page.page' },
                { subject: 'api::missing.missing' },
              ]),
            },
          },
        },
        log: {
          warn,
        },
        contentTypes,
        requestContext: {
          get: jest.fn(() => ({
            state: {
              user: { id: 1 },
              userAbility: {},
            },
          })),
        },
        db: {
          query: jest.fn(() => ({
            findMany: findConfigurations,
          })),
        },
        plugin: jest.fn(() => ({
          service: jest.fn(() => ({
            create: jest.fn(() => ({
              cannot: {
                read: jest.fn(() => false),
              },
              sanitizedQuery: {
                read: jest.fn(async (query: unknown) => query),
              },
            })),
          })),
        })),
        contentType: jest.fn((uid: keyof typeof contentTypes) => contentTypes[uid]),
        documents: jest.fn((uid: keyof typeof contentTypes) => {
          if (uid === 'api::article.article') {
            return { findMany: findArticleDocuments };
          }

          if (uid === 'api::page.page') {
            return { findMany: findPageDocuments };
          }

          throw new Error(`Unexpected content type lookup: ${uid}`);
        }),
      };

      const service = createHomepageService({ strapi } as any);

      const result = await service.queryLastDocuments({ sort: 'updatedAt:desc' });

      expect(findConfigurations).toHaveBeenCalledWith({
        where: {
          key: {
            $in: [
              'plugin_content_manager_configuration_content_types::api::article.article',
              'plugin_content_manager_configuration_content_types::api::page.page',
              'plugin_content_manager_configuration_content_types::api::missing.missing',
            ],
          },
        },
      });
      expect(findArticleDocuments).toHaveBeenCalledTimes(1);
      expect(findPageDocuments).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        'Skipping homepage content type "api::missing.missing" because it is no longer registered.'
      );
      expect(result).toMatchObject([
        { documentId: 'article-1', contentTypeUid: 'api::article.article' },
        { documentId: 'page-1', contentTypeUid: 'api::page.page' },
      ]);
    });

    it('skips stale content type permissions when querying draft-and-publish documents', async () => {
      (strapiContentTypes.hasDraftAndPublish as jest.Mock).mockImplementation((contentType) => {
        return contentType.uid === 'api::article.article';
      });

      const contentTypes = {
        'api::article.article': {
          uid: 'api::article.article',
          info: { displayName: 'Article' },
          kind: 'collectionType',
          options: { draftAndPublish: true },
          attributes: {},
        },
      };

      const findArticleDocuments = jest.fn(async () => [
        {
          documentId: 'article-1',
          title: 'Article 1',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ]);
      const findConfigurations = jest.fn(async () => [
        {
          value: JSON.stringify({
            uid: 'api::article.article',
            settings: { mainField: 'title' },
          }),
        },
      ]);
      const warn = jest.fn();

      const strapi = {
        admin: {
          services: {
            permission: {
              findMany: jest.fn(async () => [
                { subject: 'api::article.article' },
                { subject: 'api::missing.missing' },
              ]),
            },
          },
        },
        log: {
          warn,
        },
        contentTypes,
        requestContext: {
          get: jest.fn(() => ({
            state: {
              user: { id: 1 },
              userAbility: {},
            },
          })),
        },
        db: {
          query: jest.fn(() => ({
            findMany: findConfigurations,
          })),
        },
        plugin: jest.fn(() => ({
          service: jest.fn(() => ({
            create: jest.fn(() => ({
              cannot: {
                read: jest.fn(() => false),
              },
              sanitizedQuery: {
                read: jest.fn(async (query: unknown) => query),
              },
            })),
          })),
        })),
        contentType: jest.fn(() => {
          throw new Error('stale permissions should not use the throwing accessor');
        }),
        documents: jest.fn(() => ({
          findMany: findArticleDocuments,
        })),
      };

      const service = createHomepageService({ strapi } as any);

      const result = await service.queryLastDocuments({ sort: 'updatedAt:desc' }, true);

      expect(findConfigurations).toHaveBeenCalledWith({
        where: {
          key: {
            $in: ['plugin_content_manager_configuration_content_types::api::article.article'],
          },
        },
      });
      expect(findArticleDocuments).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        'Skipping homepage content type "api::missing.missing" because it is no longer registered.'
      );
      expect(result).toMatchObject([
        { documentId: 'article-1', contentTypeUid: 'api::article.article' },
      ]);
    });

    it('returns updatedAt and publishedAt as ISO strings (not Date objects)', async () => {
      /**
       * Regression for https://github.com/strapi/strapi/issues/27013:
       * wrapping timestamps in `Date` made JSON responses emit `{}` after spread/clone,
       * which crashes RelativeTime (RangeError: Start Date is invalid).
       */
      (strapiContentTypes.hasDraftAndPublish as jest.Mock).mockImplementation(() => true);

      const updatedAt = '2026-07-10T16:24:13.962Z';
      const publishedAt = '2026-07-10T16:24:14.099Z';

      const contentTypes = {
        'api::article.article': {
          uid: 'api::article.article',
          info: { displayName: 'Article' },
          kind: 'collectionType',
          options: { draftAndPublish: true },
          attributes: {},
        },
      };

      const findArticleDocuments = jest.fn(async () => [
        {
          documentId: 'article-1',
          title: 'Article 1',
          updatedAt,
          publishedAt,
        },
      ]);
      const findConfigurations = jest.fn(async () => [
        {
          value: JSON.stringify({
            uid: 'api::article.article',
            settings: { mainField: 'title' },
          }),
        },
      ]);

      const strapi = {
        admin: {
          services: {
            permission: {
              findMany: jest.fn(async () => [{ subject: 'api::article.article' }]),
            },
          },
        },
        contentTypes,
        requestContext: {
          get: jest.fn(() => ({
            state: {
              user: { id: 1 },
              userAbility: {},
            },
          })),
        },
        db: {
          query: jest.fn(() => ({
            findMany: findConfigurations,
          })),
        },
        plugin: jest.fn(() => ({
          service: jest.fn(() => ({
            create: jest.fn(() => ({
              cannot: {
                read: jest.fn(() => false),
              },
              sanitizedQuery: {
                read: jest.fn(async (query: unknown) => query),
              },
            })),
          })),
        })),
        contentType: jest.fn((uid: keyof typeof contentTypes) => contentTypes[uid]),
        documents: jest.fn(() => ({
          findMany: findArticleDocuments,
        })),
      };

      const service = createHomepageService({ strapi } as any);

      const result = await service.queryLastDocuments({ sort: 'publishedAt:desc' }, true);
      const wire = JSON.parse(JSON.stringify(result));

      expect(result).toHaveLength(1);
      expect(typeof result[0].updatedAt).toBe('string');
      expect(typeof result[0].publishedAt).toBe('string');
      expect(result[0].updatedAt).toBe(updatedAt);
      expect(result[0].publishedAt).toBe(publishedAt);
      expect(wire[0].updatedAt).toBe(updatedAt);
      expect(wire[0].publishedAt).toBe(publishedAt);
      expect(wire[0].updatedAt).not.toEqual({});
      expect(wire[0].publishedAt).not.toEqual({});
    });

    it('excludes non-displayed content types from recent documents', async () => {
      const contentTypes = {
        'api::article.article': {
          uid: 'api::article.article',
          info: { displayName: 'Article' },
          kind: 'collectionType',
          options: {},
          attributes: {},
        },
        'plugin::users-permissions.role': {
          uid: 'plugin::users-permissions.role',
          info: { displayName: 'Role' },
          kind: 'collectionType',
          options: {},
          attributes: {},
          pluginOptions: { 'content-manager': { visible: false } },
        },
      };

      const findArticleDocuments = jest.fn(async () => [
        {
          documentId: 'article-1',
          title: 'Article 1',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ]);
      const findConfigurations = jest.fn(async () => [
        {
          value: JSON.stringify({
            uid: 'api::article.article',
            settings: { mainField: 'title' },
          }),
        },
      ]);

      const strapi = {
        admin: {
          services: {
            permission: {
              findMany: jest.fn(async () => [
                { subject: 'api::article.article' },
                { subject: 'plugin::users-permissions.role' },
              ]),
            },
          },
        },
        contentTypes,
        requestContext: {
          get: jest.fn(() => ({
            state: {
              user: { id: 1 },
              userAbility: {},
            },
          })),
        },
        db: {
          query: jest.fn(() => ({
            findMany: findConfigurations,
          })),
        },
        plugin: jest.fn(() => ({
          service: jest.fn(() => ({
            create: jest.fn(() => ({
              cannot: {
                read: jest.fn(() => false),
              },
              sanitizedQuery: {
                read: jest.fn(async (query: unknown) => query),
              },
            })),
          })),
        })),
        contentType: jest.fn((uid: keyof typeof contentTypes) => contentTypes[uid]),
        documents: jest.fn(() => ({
          findMany: findArticleDocuments,
        })),
      };

      const service = createHomepageService({ strapi } as any);

      const result = await service.queryLastDocuments({ sort: 'updatedAt:desc' });

      expect(findArticleDocuments).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject([
        { documentId: 'article-1', contentTypeUid: 'api::article.article' },
      ]);
    });
  });
});
