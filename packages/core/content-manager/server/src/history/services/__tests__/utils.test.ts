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

const createStrapiWithRetention = ({
  feature,
  userRetentionDays,
}: {
  feature?: { name: string; options: Record<string, unknown> };
  userRetentionDays?: unknown;
}) => {
  return {
    ee: { features: { get: jest.fn(() => feature) } },
    config: { get: jest.fn(() => userRetentionDays) },
  } as unknown as Core.Strapi;
};

const historyFeature = (options: Record<string, unknown>) => ({
  name: 'cms-content-history',
  options,
});

describe('History utils', () => {
  describe('getRetentionDays', () => {
    const getRetentionDays = (fixture: Parameters<typeof createStrapiWithRetention>[0]) =>
      createServiceUtils({ strapi: createStrapiWithRetention(fixture) }).getRetentionDays();

    it('caps the license retention to 90 days', () => {
      expect(getRetentionDays({ feature: historyFeature({ retentionDays: 99999 }) })).toBe(90);
    });

    it('uses the license retention when it is lower than 90 days', () => {
      expect(getRetentionDays({ feature: historyFeature({ retentionDays: 30 }) })).toBe(30);
    });

    it('uses 90 days when the license has no retention', () => {
      expect(getRetentionDays({ feature: historyFeature({}) })).toBe(90);
    });

    it.each([[0], [-1], [Number.NaN], [Number.POSITIVE_INFINITY], ['30'], [null]])(
      'uses 90 days when the license retention is not a positive number (%p)',
      (retentionDays) => {
        expect(getRetentionDays({ feature: historyFeature({ retentionDays }) })).toBe(90);
      }
    );

    it('uses the user retention when the license has no retention', () => {
      expect(getRetentionDays({ feature: historyFeature({}), userRetentionDays: 365 })).toBe(365);
    });

    it('uses 90 days, never 0, when the feature is missing', () => {
      expect(getRetentionDays({ feature: undefined })).toBe(90);
    });

    it('uses a user retention lower than the license one', () => {
      expect(
        getRetentionDays({
          feature: historyFeature({ retentionDays: 99999 }),
          userRetentionDays: 30,
        })
      ).toBe(30);
    });

    it('ignores a user retention higher than the license one', () => {
      expect(
        getRetentionDays({ feature: historyFeature({ retentionDays: 30 }), userRetentionDays: 60 })
      ).toBe(30);
    });

    it('reads a user retention given as a string', () => {
      expect(
        getRetentionDays({
          feature: historyFeature({ retentionDays: 99999 }),
          userRetentionDays: '30',
        })
      ).toBe(30);
    });

    it.each([[0], [-5], [Number.NaN], ['abc']])(
      'ignores a user retention that is not a positive number (%p)',
      (userRetentionDays) => {
        expect(
          getRetentionDays({ feature: historyFeature({ retentionDays: 99999 }), userRetentionDays })
        ).toBe(90);
      }
    );
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
});
