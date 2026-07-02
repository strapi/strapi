import { createHomepageService } from '../homepage';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  contentTypes: {
    ...jest.requireActual('@strapi/utils').contentTypes,
    hasDraftAndPublish: jest.fn(() => false),
  },
}));

describe('homepage service', () => {
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

      const strapi = {
        admin: {
          services: {
            permission: {
              findMany: jest.fn(async () => [
                { subject: 'api::article.article' },
                { subject: 'api::article.article' },
                { subject: 'api::page.page' },
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
        documents: jest.fn((uid: keyof typeof contentTypes) => ({
          findMany: uid === 'api::article.article' ? findArticleDocuments : findPageDocuments,
        })),
      };

      const service = createHomepageService({ strapi } as any);

      const result = await service.queryLastDocuments({ sort: 'updatedAt:desc' });

      expect(findConfigurations).toHaveBeenCalledWith({
        where: {
          key: {
            $in: [
              'plugin_content_manager_configuration_content_types::api::article.article',
              'plugin_content_manager_configuration_content_types::api::page.page',
            ],
          },
        },
      });
      expect(findArticleDocuments).toHaveBeenCalledTimes(1);
      expect(findPageDocuments).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject([
        { documentId: 'article-1', contentTypeUid: 'api::article.article' },
        { documentId: 'page-1', contentTypeUid: 'api::page.page' },
      ]);
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
