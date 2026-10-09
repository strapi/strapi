import {
  findMatchingPermissions,
  getEffectiveConditions,
  getEffectivePropertyValues,
  isPermissionWithinCeiling,
  isWithinConditionCeiling,
  isWithinPropertyCeiling,
} from '../ceiling';

const READ = 'plugin::content-manager.explorer.read';
const CREATE = 'plugin::content-manager.explorer.create';
const ARTICLE = 'api::article.article';
const AUTHOR = 'api::author.author';

describe('Permission ceiling', () => {
  describe('findMatchingPermissions', () => {
    test('Matches on action and subject, treating null and undefined subjects alike', () => {
      const held = [
        { action: READ, subject: ARTICLE },
        { action: READ, subject: AUTHOR },
        { action: 'admin::roles.read', subject: null },
      ];

      expect(findMatchingPermissions({ action: READ, subject: ARTICLE }, held)).toEqual([held[0]]);
      expect(findMatchingPermissions({ action: 'admin::roles.read' }, held)).toEqual([held[2]]);
    });

    test('Ignores permissions with no fields, since they grant nothing', () => {
      const held = [
        { action: READ, subject: ARTICLE, properties: { fields: [] } },
        { action: READ, subject: ARTICLE, properties: { fields: ['title'] } },
      ];

      expect(findMatchingPermissions({ action: READ, subject: ARTICLE }, held)).toEqual([held[1]]);
    });
  });

  describe('getEffectivePropertyValues', () => {
    test('Is undefined when one permission is not restricted on the property', () => {
      expect(
        getEffectivePropertyValues(
          [
            { action: READ, properties: { fields: ['title'] } },
            { action: READ, properties: {} },
          ],
          'fields'
        )
      ).toBeUndefined();

      expect(
        getEffectivePropertyValues([{ action: READ, properties: { locales: null } }], 'locales')
      ).toBeUndefined();
    });

    test('Is the union of the values otherwise', () => {
      expect(
        getEffectivePropertyValues(
          [
            { action: READ, properties: { locales: ['en'] } },
            { action: READ, properties: { locales: ['fr', 'en'] } },
            { action: READ, properties: { locales: [] } },
          ],
          'locales'
        )
      ).toEqual(['en', 'fr']);
    });
  });

  describe('getEffectiveConditions', () => {
    test('Is empty when one permission is unconditional', () => {
      expect(
        getEffectiveConditions([
          { action: READ, conditions: ['admin::is-creator'] },
          { action: READ, conditions: [] },
        ])
      ).toEqual([]);
    });

    test('Is the union of the conditions otherwise', () => {
      expect(
        getEffectiveConditions([
          { action: READ, conditions: ['admin::is-creator'] },
          { action: READ, conditions: ['admin::has-same-role-as-creator', 'admin::is-creator'] },
        ])
      ).toEqual(['admin::is-creator', 'admin::has-same-role-as-creator']);
    });
  });

  describe('isPermissionWithinCeiling', () => {
    test('Rejects an action or subject that is not held', () => {
      const held = [{ action: READ, subject: ARTICLE }];

      expect(isPermissionWithinCeiling({ action: READ, subject: ARTICLE }, held)).toBe(true);
      expect(isPermissionWithinCeiling({ action: READ, subject: AUTHOR }, held)).toBe(false);
      expect(isPermissionWithinCeiling({ action: CREATE, subject: ARTICLE }, held)).toBe(false);
    });

    describe('properties', () => {
      test('Allows any fields when the holder is not restricted on fields', () => {
        const held = [
          { action: READ, subject: ARTICLE, properties: {} },
          { action: CREATE, subject: ARTICLE, properties: { fields: null } },
        ];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title', 'body'] } },
            held
          )
        ).toBe(true);
        expect(
          isPermissionWithinCeiling({ action: READ, subject: ARTICLE, properties: {} }, held)
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(
            { action: CREATE, subject: ARTICLE, properties: { fields: ['title', 'body'] } },
            held
          )
        ).toBe(true);
      });

      test('Rejects everything when the permission is only held with no fields', () => {
        const held = [{ action: READ, subject: ARTICLE, properties: { fields: [] } }];

        expect(
          isPermissionWithinCeiling({ action: READ, subject: ARTICLE, properties: {} }, held)
        ).toBe(false);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title'] } },
            held
          )
        ).toBe(false);
      });

      test('Always allows requesting no fields, since it grants nothing', () => {
        const held = [{ action: READ, subject: ARTICLE, properties: { fields: ['title'] } }];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: [] } },
            held
          )
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: AUTHOR, properties: { fields: [] } },
            held
          )
        ).toBe(true);
      });

      test('Allows a subset of the held fields, including nested fields by prefix', () => {
        const held = [{ action: READ, subject: ARTICLE, properties: { fields: ['title', 'seo'] } }];

        expect(
          isPermissionWithinCeiling(
            {
              action: READ,
              subject: ARTICLE,
              properties: { fields: ['title', 'seo.description'] },
            },
            held
          )
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title', 'body'] } },
            held
          )
        ).toBe(false);
        // A prefix only counts on a path boundary
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['seoTitle'] } },
            held
          )
        ).toBe(false);
      });

      test('Does not apply the nested rule to other properties', () => {
        const held = [{ action: READ, subject: ARTICLE, properties: { locales: ['en'] } }];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { locales: ['en.US'] } },
            held
          )
        ).toBe(false);
      });

      test('Rejects an omitted or null property when the holder is restricted on it', () => {
        const held = [{ action: READ, subject: ARTICLE, properties: { fields: ['title'] } }];

        expect(
          isPermissionWithinCeiling({ action: READ, subject: ARTICLE, properties: {} }, held)
        ).toBe(false);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: null } },
            held
          )
        ).toBe(false);
      });

      test('Uses the union of the held permissions for the same action and subject', () => {
        const held = [
          { action: READ, subject: ARTICLE, properties: { fields: ['title'] } },
          { action: READ, subject: ARTICLE, properties: { fields: ['body'] } },
        ];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title', 'body'] } },
            held
          )
        ).toBe(true);
      });

      test('Applies the same rule to locales', () => {
        const held = [
          {
            action: READ,
            subject: ARTICLE,
            properties: { fields: ['title'], locales: ['en', 'fr'] },
          },
        ];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: ['fr'] } },
            held
          )
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(
            {
              action: READ,
              subject: ARTICLE,
              properties: { fields: ['title'], locales: ['fr', 'de'] },
            },
            held
          )
        ).toBe(false);
      });

      test('Allows any locales when the held locales are null (all locales)', () => {
        const held = [
          { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: null } },
        ];

        expect(
          isPermissionWithinCeiling(
            {
              action: READ,
              subject: ARTICLE,
              properties: { fields: ['title'], locales: ['en', 'fr', 'de'] },
            },
            held
          )
        ).toBe(true);
      });

      test('Treats empty held locales as no locales', () => {
        const held = [
          { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: [] } },
        ];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: [] } },
            held
          )
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: ['en'] } },
            held
          )
        ).toBe(false);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title'] } },
            held
          )
        ).toBe(false);
      });

      test('isWithinPropertyCeiling ignores conditions', () => {
        const matching = [
          { action: READ, properties: { fields: ['title'] }, conditions: ['admin::is-creator'] },
        ];

        expect(
          isWithinPropertyCeiling({ action: READ, properties: { fields: ['title'] } }, matching)
        ).toBe(true);
      });
    });

    describe('conditions', () => {
      test('Allows any conditions when the permission is held unconditionally', () => {
        const held = [
          { action: READ, subject: ARTICLE, conditions: ['admin::is-creator'] },
          { action: READ, subject: ARTICLE, conditions: [] },
        ];

        expect(isPermissionWithinCeiling({ action: READ, subject: ARTICLE }, held)).toBe(true);
        expect(
          isPermissionWithinCeiling(
            {
              action: READ,
              subject: ARTICLE,
              conditions: ['admin::is-creator', 'admin::has-same-role-as-creator'],
            },
            held
          )
        ).toBe(true);
      });

      test('Allows a non-empty subset of the held conditions', () => {
        const held = [
          { action: READ, subject: ARTICLE, conditions: ['admin::is-creator'] },
          { action: READ, subject: ARTICLE, conditions: ['admin::has-same-role-as-creator'] },
        ];

        expect(
          isPermissionWithinCeiling(
            {
              action: READ,
              subject: ARTICLE,
              conditions: ['admin::is-creator', 'admin::has-same-role-as-creator'],
            },
            held
          )
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, conditions: ['admin::is-creator'] },
            held
          )
        ).toBe(true);
      });

      test('Rejects no conditions when the permission is only held with conditions', () => {
        const held = [{ action: READ, subject: ARTICLE, conditions: ['admin::is-creator'] }];

        expect(isPermissionWithinCeiling({ action: READ, subject: ARTICLE }, held)).toBe(false);
        expect(
          isPermissionWithinCeiling({ action: READ, subject: ARTICLE, conditions: [] }, held)
        ).toBe(false);
      });

      test('Rejects a condition that is not held', () => {
        const held = [{ action: READ, subject: ARTICLE, conditions: ['admin::is-creator'] }];

        expect(
          isPermissionWithinCeiling(
            {
              action: READ,
              subject: ARTICLE,
              conditions: ['admin::is-creator', 'admin::has-same-role-as-creator'],
            },
            held
          )
        ).toBe(false);
      });

      test('isWithinConditionCeiling ignores properties', () => {
        const matching = [{ action: READ, properties: { fields: ['title'] }, conditions: [] }];

        expect(
          isWithinConditionCeiling({ action: READ, properties: { fields: ['body'] } }, matching)
        ).toBe(true);
      });
    });
  });
});
