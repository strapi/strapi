import type { Core, Schema } from '@strapi/types';

import { createServiceUtils } from '../utils';

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
  const services: Record<string, unknown> = {
    locales: {
      getDefaultLocale: jest.fn(async () => fixture.defaultLocale),
      find: jest.fn(async () =>
        fixture.locales.map((locale, index) => ({
          id: index + 1,
          ...locale,
          isDefault: locale.code === fixture.defaultLocale,
        }))
      ),
    },
    'content-types': { isLocalizedContentType },
  };
  const strapi = {
    plugin: jest.fn((name: string) =>
      name === 'i18n' ? { service: (serviceName: string) => services[serviceName] } : undefined
    ),
  } as unknown as Core.Strapi;

  return { strapi, isLocalizedContentType };
};

const createStrapiWithoutLocalization = () => {
  return { plugin: jest.fn(() => undefined) } as unknown as Core.Strapi;
};

describe('History utils', () => {
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
});
