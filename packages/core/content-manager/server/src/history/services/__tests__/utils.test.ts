import { createServiceUtils } from '../utils';

const baseStrapiMock = {
  plugin: jest.fn(() => {}),
};

/**
 * `feature` is what `strapi.ee.features.get('cms-content-history')` resolves to, and
 * `userRetentionDays` what the user configured under `admin.history.retentionDays`.
 */
const getRetentionDaysWith = ({
  feature,
  userRetentionDays,
}: {
  feature?: unknown;
  userRetentionDays?: unknown;
}) => {
  const strapiMock = {
    ...baseStrapiMock,
    ee: { features: { get: jest.fn(() => feature) } },
    config: {
      get: jest.fn((path: string) =>
        path === 'admin.history.retentionDays' ? userRetentionDays : undefined
      ),
    },
  };

  // @ts-expect-error partial mock
  return createServiceUtils({ strapi: strapiMock }).getRetentionDays();
};

const licenseWithRetention = (retentionDays: unknown) => ({
  name: 'cms-content-history',
  options: { retentionDays },
});

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

  describe('getRetentionDays', () => {
    /**
     * `ee.disable()` drops `features` from the license info, so `features.get()` returns
     * undefined as soon as a license lapses. That can happen at any point after boot — the
     * license is re-checked every 12 hours — while the daily prune cron keeps running, so a
     * retention of 0 here deletes every row in `strapi_history_versions`.
     */
    describe('when the license does not grant the feature', () => {
      it('falls back to the default rather than expiring every version', () => {
        expect(getRetentionDaysWith({ feature: undefined })).toBe(90);
      });

      it('honours a user-configured retention', () => {
        expect(getRetentionDaysWith({ feature: undefined, userRetentionDays: 2 })).toBe(2);
      });
    });

    describe('when the license grants the feature without a retention window', () => {
      it('does not throw on a license that omits options', () => {
        expect(() =>
          getRetentionDaysWith({ feature: { name: 'cms-content-history' } })
        ).not.toThrow();
      });

      it('falls back to the default', () => {
        expect(getRetentionDaysWith({ feature: { name: 'cms-content-history' } })).toBe(90);
      });

      it('honours a user-configured retention', () => {
        expect(
          getRetentionDaysWith({
            feature: licenseWithRetention(null),
            userRetentionDays: 30,
          })
        ).toBe(30);
      });
    });

    describe('when the license pins a retention window', () => {
      it('uses the license value when it is below the default', () => {
        expect(getRetentionDaysWith({ feature: licenseWithRetention(45) })).toBe(45);
      });

      it('caps the license value at the default', () => {
        // The gold license ships `retentionDays: 99999`
        expect(getRetentionDaysWith({ feature: licenseWithRetention(99999) })).toBe(90);
      });

      it('lets the user lower retention below the license value', () => {
        expect(
          getRetentionDaysWith({ feature: licenseWithRetention(99999), userRetentionDays: 30 })
        ).toBe(30);
      });

      it('does not let the user raise retention above the license value', () => {
        expect(
          getRetentionDaysWith({ feature: licenseWithRetention(45), userRetentionDays: 200 })
        ).toBe(45);
      });
    });

    describe('never returns a retention that would expire every version', () => {
      it.each([
        ['is absent', undefined],
        ['omits options', { name: 'cms-content-history' }],
        ['has null retention', licenseWithRetention(null)],
        ['has zero retention', licenseWithRetention(0)],
        ['has negative retention', licenseWithRetention(-1)],
        ['has NaN retention', licenseWithRetention(NaN)],
      ])('returns a positive, finite number of days when the license %s', (_label, feature) => {
        const retentionDays = getRetentionDaysWith({ feature });

        expect(retentionDays).toBeGreaterThan(0);
        expect(Number.isFinite(retentionDays)).toBe(true);
      });

      it.each([
        ['zero', 0],
        ['negative', -1],
        ['NaN', NaN],
        ['non-numeric', 'thirty'],
      ])('ignores a %s user retention value', (_label, userRetentionDays) => {
        expect(getRetentionDaysWith({ feature: undefined, userRetentionDays })).toBe(90);
      });

      it('accepts a numeric string, as env-derived config often is', () => {
        expect(getRetentionDaysWith({ feature: undefined, userRetentionDays: '30' })).toBe(30);
      });
    });
  });
});
