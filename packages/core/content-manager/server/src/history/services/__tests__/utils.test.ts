import type { Core, Schema } from '@strapi/types';

import { createServiceUtils, toAuthor, type RequestContext } from '../utils';

const mockFindNames = jest.fn();

const mockKnownProvider = {
  type: 'person',
  model: 'plugin::fake.user',
  getRecordId: (credentials: { id?: number } | null) => credentials?.id,
};

jest.mock('../../utils', () => ({
  getService: () => ({
    findNames: mockFindNames,
    findProviderByStrategy: (strategy: string) =>
      strategy === 'known' ? mockKnownProvider : undefined,
  }),
}));

const baseStrapiMock = {
  plugin: jest.fn(() => {}),
};

const articleModel = {
  uid: 'api::article.article',
  modelType: 'contentType',
  attributes: {},
} as unknown as Schema.ContentType;

const createCtx = (
  pluginName: string,
  strategyName: string,
  type = 'admin',
  credentials: { id: number } | null = { id: 2 }
) =>
  ({
    state: {
      route: { info: { pluginName, type } },
      auth: { strategy: { name: strategyName }, credentials },
    },
  }) as unknown as RequestContext;

type LocalizationFixture = {
  defaultLocale: string;
  locales: Array<{ code: string; name: string }>;
  isLocalized: boolean;
};

const createStrapiWithLocalization = (fixture: LocalizationFixture) => {
  const isLocalizedContentType = jest.fn(() => fixture.isLocalized);
  const strapi = {
    localization: {
      getDefaultLocale: jest.fn(async () => fixture.defaultLocale),
      getLocales: jest.fn(async () => fixture.locales),
      isLocalizedContentType,
    },
  } as unknown as Core.Strapi;

  return { strapi, isLocalizedContentType };
};

// Mirrors core's inert defaults when no localization provider is registered
const createStrapiWithoutLocalization = () => {
  return {
    localization: {
      getDefaultLocale: jest.fn(async () => null),
      getLocales: jest.fn(async () => []),
      isLocalizedContentType: jest.fn(() => false),
    },
  } as unknown as Core.Strapi;
};

describe('History utils', () => {
  describe('getVersionStatus', () => {
    it('does not populate available locales when resolving relation status', async () => {
      const getMetadata = jest.fn().mockResolvedValue({ availableStatus: [] });
      const getStatus = jest.fn().mockReturnValue('draft');
      const strapi = {
        plugin: jest.fn((name: string) =>
          name === 'content-manager'
            ? {
                service: () => ({ getMetadata, getStatus }),
              }
            : undefined
        ),
      };
      const { getVersionStatus } = createServiceUtils({
        // @ts-expect-error minimal service mock
        strapi,
      });
      const document = { id: 1, documentId: 'doc-1', locale: 'fr', publishedAt: null };

      await getVersionStatus('api::article.article', document);

      expect(getMetadata).toHaveBeenCalledWith('api::article.article', document, {
        availableLocales: false,
      });
    });
  });

  describe('getSchemaAttributesDiff', () => {
    const { getSchemaAttributesDiff } = createServiceUtils({
      // @ts-expect-error ignore
      strapi: baseStrapiMock,
    });

    it('should return a diff', () => {
      const versionSchema = {
        title: {
          type: 'string',
        },
        someOtherField: {
          type: 'string',
        },
      };
      const contentTypeSchema = {
        renamed: {
          type: 'string',
        },
        newField: {
          type: 'string',
        },
        someOtherField: {
          type: 'string',
        },
      };

      // @ts-expect-error ignore
      const { added, removed } = getSchemaAttributesDiff(versionSchema, contentTypeSchema);

      expect(added).toEqual({
        renamed: {
          type: 'string',
        },
        newField: {
          type: 'string',
        },
      });
      expect(removed).toEqual({
        title: {
          type: 'string',
        },
      });
    });

    it('should not return a diff', () => {
      const versionSchema = {
        title: {
          type: 'string',
        },
      };
      const contentTypeSchema = {
        title: {
          type: 'string',
        },
      };

      // @ts-expect-error ignore
      const { added, removed } = getSchemaAttributesDiff(versionSchema, contentTypeSchema);

      expect(added).toEqual({});
      expect(removed).toEqual({});
    });
  });

  describe('localization helpers', () => {
    const fixture: LocalizationFixture = {
      defaultLocale: 'en',
      locales: [
        { code: 'en', name: 'English (en)' },
        { code: 'fr', name: 'French (fr)' },
      ],
      isLocalized: true,
    };

    describe('with a localization plugin', () => {
      it('getDefaultLocale returns the default locale code', async () => {
        const { strapi } = createStrapiWithLocalization(fixture);
        const { getDefaultLocale } = createServiceUtils({ strapi });

        await expect(getDefaultLocale()).resolves.toBe('en');
      });

      it('isLocalizedContentType delegates the model check', () => {
        const { strapi, isLocalizedContentType } = createStrapiWithLocalization(fixture);
        const utils = createServiceUtils({ strapi });

        expect(utils.isLocalizedContentType(articleModel)).toBe(true);
        expect(isLocalizedContentType).toHaveBeenCalledWith(articleModel);
      });

      it('isLocalizedContentType returns false for a non-localized model', () => {
        const { strapi } = createStrapiWithLocalization({ ...fixture, isLocalized: false });
        const utils = createServiceUtils({ strapi });

        expect(utils.isLocalizedContentType(articleModel)).toBe(false);
      });

      it('getLocaleDictionary maps locale codes to their name and code', async () => {
        const { strapi } = createStrapiWithLocalization(fixture);
        const { getLocaleDictionary } = createServiceUtils({ strapi });

        await expect(getLocaleDictionary()).resolves.toEqual({
          en: { name: 'English (en)', code: 'en' },
          fr: { name: 'French (fr)', code: 'fr' },
        });
      });

      it('getLocaleDictionary returns an empty dictionary when there are no locales', async () => {
        const { strapi } = createStrapiWithLocalization({ ...fixture, locales: [] });
        const { getLocaleDictionary } = createServiceUtils({ strapi });

        await expect(getLocaleDictionary()).resolves.toEqual({});
      });
    });

    describe('without a localization plugin', () => {
      it('getDefaultLocale returns null', async () => {
        const { getDefaultLocale } = createServiceUtils({
          strapi: createStrapiWithoutLocalization(),
        });

        await expect(getDefaultLocale()).resolves.toBeNull();
      });

      it('isLocalizedContentType returns false', () => {
        const utils = createServiceUtils({ strapi: createStrapiWithoutLocalization() });

        expect(utils.isLocalizedContentType(articleModel)).toBe(false);
      });

      it('getLocaleDictionary returns an empty dictionary', async () => {
        const { getLocaleDictionary } = createServiceUtils({
          strapi: createStrapiWithoutLocalization(),
        });

        await expect(getLocaleDictionary()).resolves.toEqual({});
      });
    });
  });

  describe('author helpers', () => {
    const adminUser = (id: string | null) => ({
      type: 'person' as const,
      model: 'admin::user',
      id,
    });

    it('getAuthorNameDictionary finds the current names with one lookup per model', async () => {
      mockFindNames.mockImplementation(async (model: string) =>
        model === 'admin::user' ? { 1: 'kai', 2: 'John Doe' } : { 5: 'CI token' }
      );
      const { getAuthorNameDictionary } = createServiceUtils({ strapi: {} as Core.Strapi });

      await expect(
        getAuthorNameDictionary([
          adminUser('1'),
          adminUser('2'),
          adminUser('1'),
          adminUser(null),
          { type: 'token', model: 'admin::api-token', id: '5' },
          null,
        ])
      ).resolves.toEqual({
        'admin::user': { 1: 'kai', 2: 'John Doe' },
        'admin::api-token': { 5: 'CI token' },
      });
      expect(mockFindNames).toHaveBeenCalledTimes(2);
      expect(mockFindNames).toHaveBeenCalledWith('admin::user', ['1', '2']);
      expect(mockFindNames).toHaveBeenCalledWith('admin::api-token', ['5']);
    });

    it('findAdminUserNames finds the current names, with the display name rule', async () => {
      const findMany = jest.fn().mockResolvedValue([
        {
          documentId: '1',
          username: 'kai',
          firstname: 'Kai',
          lastname: 'Doe',
          email: 'a@test.com',
        },
        {
          documentId: '2',
          username: null,
          firstname: 'John',
          lastname: 'Doe',
          email: 'b@test.com',
        },
        { documentId: '3', username: null, firstname: 'Ana', lastname: null, email: 'c@test.com' },
        { documentId: '4', username: null, firstname: null, lastname: null, email: 'd@test.com' },
      ]);
      const strapi = { db: { query: jest.fn(() => ({ findMany })) } } as unknown as Core.Strapi;
      const { findAdminUserNames } = createServiceUtils({ strapi });

      await expect(findAdminUserNames(['1', '2', '3', '4'])).resolves.toEqual({
        1: 'kai',
        2: 'John Doe',
        3: 'Ana',
        4: 'd@test.com',
      });
      expect(findMany).toHaveBeenCalledWith({
        select: ['documentId', 'username', 'firstname', 'lastname', 'email'],
        where: { documentId: { $in: ['1', '2', '3', '4'] } },
      });
    });

    it('findApiTokenNames finds the current names of tokens', async () => {
      const findMany = jest.fn().mockResolvedValue([{ documentId: '5', name: 'CI token' }]);
      const strapi = { db: { query: jest.fn(() => ({ findMany })) } } as unknown as Core.Strapi;
      const { findApiTokenNames } = createServiceUtils({ strapi });

      await expect(findApiTokenNames(['5'])).resolves.toEqual({ 5: 'CI token' });
    });

    it('toAuthor gives no id and no name to a deleted author', () => {
      const authorNameDictionary = { 'admin::user': { 1: 'kai' } };

      expect(toAuthor(adminUser(null), authorNameDictionary)).toEqual({
        ...adminUser(null),
        name: null,
      });
      expect(toAuthor(adminUser('3'), authorNameDictionary)).toEqual({
        ...adminUser(null),
        name: null,
      });
    });
  });

  describe('resolveHistoryOrigin', () => {
    const { resolveHistoryOrigin } = createServiceUtils({
      // @ts-expect-error ignore
      strapi: baseStrapiMock,
    });

    it('resolves an admin session on a Content Manager route to the admin panel source', () => {
      expect(resolveHistoryOrigin(createCtx('content-manager', 'admin'))?.source).toBe(
        'admin-panel'
      );
    });

    it('resolves an admin token on a Content Manager route to the admin API source', () => {
      expect(resolveHistoryOrigin(createCtx('content-manager', 'admin-token'))?.source).toBe(
        'admin-api'
      );
    });

    it('resolves a Content API route to the Content API source, with the author of a registered strategy', () => {
      expect(resolveHistoryOrigin(createCtx('api', 'known', 'content-api'))).toEqual({
        source: 'content-api',
        author: { type: 'person', model: 'plugin::fake.user', id: '2' },
      });
    });

    it('resolves credentials with no record to no author', () => {
      expect(resolveHistoryOrigin(createCtx('api', 'known', 'content-api', null))).toEqual({
        source: 'content-api',
        author: null,
      });
    });

    it('resolves a strategy with no provider to no author', () => {
      expect(resolveHistoryOrigin(createCtx('api', 'custom', 'content-api'))).toEqual({
        source: 'content-api',
        author: null,
      });
    });

    it('resolves a route without a strategy to no author', () => {
      const ctx = {
        state: { route: { info: { type: 'content-api' } } },
      } as unknown as RequestContext;

      expect(resolveHistoryOrigin(ctx)).toEqual({ source: 'content-api', author: null });
    });

    it('resolves nothing on another admin route', () => {
      expect(resolveHistoryOrigin(createCtx('admin', 'admin'))).toBeNull();
    });

    it('resolves nothing without a request context', () => {
      expect(resolveHistoryOrigin(undefined)).toBeNull();
    });
  });
});
