import type { Core, Schema } from '@strapi/types';

import { createServiceUtils, toAuthor } from '../utils';

const baseStrapiMock = {
  plugin: jest.fn(() => {}),
};

const articleModel = {
  uid: 'api::article.article',
  modelType: 'contentType',
  attributes: {},
} as unknown as Schema.ContentType;

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

    it('getAuthorNameDictionary finds the current names with one query per model', async () => {
      const findMany = jest.fn(({ select }) =>
        select.includes('email')
          ? [
              {
                documentId: '1',
                username: 'kai',
                firstname: 'Kai',
                lastname: 'Doe',
                email: 'kai@test.com',
              },
              {
                documentId: '2',
                username: null,
                firstname: 'John',
                lastname: 'Doe',
                email: 'john@test.com',
              },
              {
                documentId: '3',
                username: null,
                firstname: 'Ana',
                lastname: null,
                email: 'ana@test.com',
              },
              {
                documentId: '4',
                username: null,
                firstname: null,
                lastname: null,
                email: 'jane@test.com',
              },
            ]
          : [{ documentId: '5', name: 'CI token' }]
      );
      const strapi = { db: { query: jest.fn(() => ({ findMany })) } } as unknown as Core.Strapi;
      const { getAuthorNameDictionary } = createServiceUtils({ strapi });

      await expect(
        getAuthorNameDictionary([
          adminUser('1'),
          adminUser('2'),
          adminUser('3'),
          adminUser('4'),
          adminUser('1'),
          adminUser(null),
          { type: 'token', model: 'admin::api-token', id: '5' },
          null,
        ])
      ).resolves.toEqual({
        'admin::user': { 1: 'kai', 2: 'John Doe', 3: 'Ana', 4: 'jane@test.com' },
        'admin::api-token': { 5: 'CI token' },
      });
      expect(findMany).toHaveBeenCalledTimes(2);
      expect(findMany).toHaveBeenCalledWith({
        select: ['documentId', 'username', 'firstname', 'lastname', 'email'],
        where: { documentId: { $in: ['1', '2', '3', '4'] } },
      });
      expect(findMany).toHaveBeenCalledWith({
        select: ['documentId', 'name'],
        where: { documentId: { $in: ['5'] } },
      });
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
});
