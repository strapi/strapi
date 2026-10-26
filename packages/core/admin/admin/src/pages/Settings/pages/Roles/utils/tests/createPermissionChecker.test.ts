import {
  canTick,
  coversAtom,
  coversCondition,
  coversPropertyValue,
  createBulkPermissionChecker,
  createSubjectBulkPermissionChecker,
  findActionForm,
  getActionSelection,
  getAllowedConditions,
  isPermissionHeld,
  isPermissionWithinCeiling,
  isValueSelected,
  toEnforcedPermissions,
} from '../createPermissionChecker';
import { updateValuesWithPermissions } from '../updateValues';

import type * as PermissionContracts from '../../../../../../../../shared/contracts/permissions';
import type { Permission as AuthPermission } from '../../../../../../features/Auth';

const READ = 'plugin::content-manager.explorer.read';
const CREATE = 'plugin::content-manager.explorer.create';
const SUBJECT = 'api::article.article';
const IS_CREATOR = 'admin::is-creator';
const SAME_ROLE = 'admin::has-same-role-as-creator';

const permission = (
  action: string,
  subject: string | null,
  properties: AuthPermission['properties'] = {},
  conditions: string[] = []
): AuthPermission => ({ action, subject, properties, conditions });

const read = (properties: AuthPermission['properties'], conditions?: string[]) =>
  permission(READ, SUBJECT, properties, conditions);

// `fields: null` (unrestricted) is stored by the server but not allowed by the contract type
const readAnyField = () => read({ fields: null } as unknown as AuthPermission['properties']);

// Two held permissions that must not be recombined
const titleEn = read({ fields: ['title'], locales: ['en'] });
const bodyFr = read({ fields: ['body'], locales: ['fr'] });
const titleAlways = read({ fields: ['title'] });
const bodyIfCreator = read({ fields: ['body'] }, [IS_CREATOR]);

const selection = (properties: Record<string, string[]>, conditions: string[] = []) => ({
  properties,
  conditions,
});

describe('createPermissionChecker', () => {
  describe('isPermissionHeld', () => {
    it('checks the action and subject, treating null and undefined subjects alike', () => {
      const permissions = [permission('admin::roles.read', null)];

      expect(isPermissionHeld(permissions, 'admin::roles.read', null)).toBe(true);
      expect(isPermissionHeld(permissions, 'admin::roles.read', undefined)).toBe(true);
      expect(isPermissionHeld(permissions, 'admin::roles.update', null)).toBe(false);
    });

    it('checks a value against any matching permission', () => {
      expect(isPermissionHeld([titleEn, bodyFr], READ, SUBJECT, 'fields', 'body')).toBe(true);
      expect(isPermissionHeld([titleEn, bodyFr], READ, SUBJECT, 'locales', 'fr')).toBe(true);
      expect(isPermissionHeld([titleEn, bodyFr], READ, SUBJECT, 'locales', 'de')).toBe(false);
    });

    it('covers nested fields by their parent, but not other properties', () => {
      const permissions = [read({ fields: ['seo'], locales: ['en'] })];

      expect(isPermissionHeld(permissions, READ, SUBJECT, 'fields', 'seo.title')).toBe(true);
      expect(isPermissionHeld(permissions, READ, SUBJECT, 'fields', 'seoTitle')).toBe(false);
      expect(isPermissionHeld(permissions, READ, SUBJECT, 'locales', 'en.US')).toBe(false);
    });

    it('allows every value of a property the permission does not restrict', () => {
      expect(isPermissionHeld([read({ locales: null })], READ, SUBJECT, 'locales', 'fr')).toBe(
        true
      );
      expect(isPermissionHeld([read({})], READ, SUBJECT, 'fields', 'body')).toBe(true);
    });

    it('ignores a permission with no fields, which grants nothing', () => {
      expect(isPermissionHeld([read({ fields: [] })], READ, SUBJECT)).toBe(false);
      expect(
        isPermissionHeld([read({ fields: [] }), titleAlways], READ, SUBJECT, 'fields', 'title')
      ).toBe(true);
    });
  });

  describe('coversAtom', () => {
    it('requires one permission to cover every dimension present', () => {
      const held = read({ fields: ['title'], locales: ['en'] }, [IS_CREATOR]);

      expect(
        coversAtom(held, { properties: { fields: 'title', locales: 'en' }, condition: IS_CREATOR })
      ).toBe(true);
      expect(coversAtom(held, { properties: { fields: 'title', locales: 'fr' } })).toBe(false);
      expect(coversAtom(held, { properties: { fields: 'title' }, condition: SAME_ROLE })).toBe(
        false
      );
      // A dimension that is absent does not constrain the permission
      expect(coversAtom(held, { properties: { fields: 'title' } })).toBe(true);
    });

    it('needs an unrestricted holder for an unrestricted dimension', () => {
      expect(coversPropertyValue(read({ fields: ['title'] }), 'fields', null)).toBe(false);
      expect(coversPropertyValue(read({ locales: null }), 'locales', null)).toBe(true);
      expect(coversPropertyValue(read({}), 'fields', null)).toBe(true);

      expect(coversCondition(read({}, [IS_CREATOR]), null)).toBe(false);
      expect(coversCondition(read({}), null)).toBe(true);
    });
  });

  /**
   * Mirrors the `isPermissionWithinCeiling` cases of the server
   * (`server/src/domain/permission/__tests__/ceiling.test.ts`), so the duplicate filter and the
   * server agree.
   */
  describe('isPermissionWithinCeiling', () => {
    const titleFr = read({ fields: ['title'], locales: ['fr'] });
    const bodyAlways = read({ fields: ['body'] });

    it('checks the action and subject', () => {
      const held = [read({})];

      expect(isPermissionWithinCeiling(held, read({}))).toBe(true);
      expect(isPermissionWithinCeiling(held, permission(READ, 'api::author.author'))).toBe(false);
      expect(isPermissionWithinCeiling(held, permission(CREATE, SUBJECT))).toBe(false);
      expect(
        isPermissionWithinCeiling([permission('admin::roles.read', null)], {
          action: 'admin::roles.read',
        })
      ).toBe(true);
    });

    it('allows any fields when the holder is not restricted on fields', () => {
      expect(isPermissionWithinCeiling([read({})], read({ fields: ['title', 'body'] }))).toBe(true);
      expect(isPermissionWithinCeiling([readAnyField()], read({ fields: ['title', 'body'] }))).toBe(
        true
      );
    });

    it('always allows requesting no fields, and ignores a held permission with no fields', () => {
      expect(isPermissionWithinCeiling([titleAlways], read({ fields: [] }))).toBe(true);
      expect(isPermissionWithinCeiling([], read({ fields: [] }))).toBe(true);
      expect(isPermissionWithinCeiling([read({ fields: [] })], read({}))).toBe(false);
      expect(isPermissionWithinCeiling([read({ fields: [] })], read({ fields: ['title'] }))).toBe(
        false
      );
    });

    it('allows a subset of the held fields, including nested fields by their parent', () => {
      const held = [read({ fields: ['title', 'seo'] })];

      expect(isPermissionWithinCeiling(held, read({ fields: ['title', 'seo.description'] }))).toBe(
        true
      );
      expect(isPermissionWithinCeiling(held, read({ fields: ['title', 'body'] }))).toBe(false);
      expect(isPermissionWithinCeiling(held, read({ fields: ['seoTitle'] }))).toBe(false);
      expect(
        isPermissionWithinCeiling([read({ locales: ['en'] })], read({ locales: ['en.US'] }))
      ).toBe(false);
    });

    it('rejects an omitted or null property when the holder is restricted on it', () => {
      expect(isPermissionWithinCeiling([titleAlways], read({}))).toBe(false);
      expect(isPermissionWithinCeiling([titleAlways], readAnyField())).toBe(false);
      // Restricted on the request only, against an unrestricted holder
      expect(
        isPermissionWithinCeiling([titleAlways], read({ fields: ['title'], locales: ['en'] }))
      ).toBe(true);
    });

    it('applies the same rule to locales', () => {
      const held = [read({ fields: ['title'], locales: ['en', 'fr'] })];

      expect(isPermissionWithinCeiling(held, read({ fields: ['title'], locales: ['fr'] }))).toBe(
        true
      );
      expect(
        isPermissionWithinCeiling(held, read({ fields: ['title'], locales: ['fr', 'de'] }))
      ).toBe(false);
      expect(
        isPermissionWithinCeiling(
          [read({ fields: ['title'], locales: null })],
          read({ fields: ['title'], locales: ['en', 'fr', 'de'] })
        )
      ).toBe(true);
    });

    it('needs an unrestricted holder for omitted or null locales', () => {
      const restricted = [titleEn, titleFr];

      expect(isPermissionWithinCeiling(restricted, read({ fields: ['title'] }))).toBe(false);
      expect(
        isPermissionWithinCeiling(restricted, read({ fields: ['title'], locales: null }))
      ).toBe(false);
      expect(
        isPermissionWithinCeiling(
          [read({ fields: ['title'], locales: null })],
          read({ fields: ['title'], locales: null })
        )
      ).toBe(true);
    });

    it('treats empty locales as no locales, still checking fields and conditions', () => {
      const held = [read({ fields: ['title'], locales: [] })];

      expect(isPermissionWithinCeiling(held, read({ fields: ['title'], locales: [] }))).toBe(true);
      expect(isPermissionWithinCeiling(held, read({ fields: ['title'], locales: ['en'] }))).toBe(
        false
      );
      expect(isPermissionWithinCeiling(held, read({ fields: ['title'] }))).toBe(false);
      expect(isPermissionWithinCeiling([titleEn], read({ fields: ['body'], locales: [] }))).toBe(
        false
      );
      expect(
        isPermissionWithinCeiling(
          [read({ fields: ['title'] }, [IS_CREATOR])],
          read({ fields: ['title'], locales: [] })
        )
      ).toBe(false);
    });

    it('allows a non-empty subset of the held conditions', () => {
      const held = [read({}, [IS_CREATOR, SAME_ROLE])];

      expect(isPermissionWithinCeiling(held, read({}, [IS_CREATOR, SAME_ROLE]))).toBe(true);
      expect(isPermissionWithinCeiling(held, read({}, [IS_CREATOR]))).toBe(true);
      expect(
        isPermissionWithinCeiling([read({}, [IS_CREATOR])], read({}, [IS_CREATOR, SAME_ROLE]))
      ).toBe(false);
    });

    it('allows any conditions when the permission is held unconditionally', () => {
      const held = [read({}, [IS_CREATOR]), read({})];

      expect(isPermissionWithinCeiling(held, read({}))).toBe(true);
      expect(isPermissionWithinCeiling(held, read({}, [IS_CREATOR, SAME_ROLE]))).toBe(true);
    });

    it('rejects no conditions when the permission is only held with conditions', () => {
      expect(isPermissionWithinCeiling([read({}, [IS_CREATOR])], read({}))).toBe(false);
      expect(isPermissionWithinCeiling([read({}, [IS_CREATOR])], read({}, []))).toBe(false);
    });

    it('does not mix the fields of one permission with the locales of another', () => {
      const held = [titleEn, bodyFr];

      expect(isPermissionWithinCeiling(held, read({ fields: ['title'], locales: ['fr'] }))).toBe(
        false
      );
      expect(isPermissionWithinCeiling(held, read({ fields: ['body'], locales: ['en'] }))).toBe(
        false
      );
      expect(
        isPermissionWithinCeiling(held, read({ fields: ['title', 'body'], locales: ['en', 'fr'] }))
      ).toBe(false);
      expect(isPermissionWithinCeiling(held, read({ fields: ['title'], locales: ['en'] }))).toBe(
        true
      );
    });

    it('does not lift the conditions of one permission with an unconditional one', () => {
      const held = [titleAlways, bodyIfCreator];

      expect(isPermissionWithinCeiling(held, read({ fields: ['body'] }))).toBe(false);
      expect(isPermissionWithinCeiling(held, read({ fields: ['title', 'body'] }))).toBe(false);
      expect(isPermissionWithinCeiling(held, read({ fields: ['body'] }, [IS_CREATOR]))).toBe(true);
      expect(
        isPermissionWithinCeiling(held, read({ fields: ['title', 'body'] }, [IS_CREATOR]))
      ).toBe(true);
    });

    it('still allows unions on one dimension across held permissions', () => {
      expect(
        isPermissionWithinCeiling([titleAlways, bodyAlways], read({ fields: ['title', 'body'] }))
      ).toBe(true);
      expect(
        isPermissionWithinCeiling(
          [titleEn, titleFr],
          read({ fields: ['title'], locales: ['en', 'fr'] })
        )
      ).toBe(true);
      expect(
        isPermissionWithinCeiling(
          [read({ fields: ['title'] }, [IS_CREATOR]), read({ fields: ['title'] }, [SAME_ROLE])],
          read({ fields: ['title'] }, [IS_CREATOR, SAME_ROLE])
        )
      ).toBe(true);
    });

    it('does not mix a condition held on one locale with another locale', () => {
      const held = [
        read({ fields: ['title'], locales: ['en'] }, [IS_CREATOR]),
        read({ fields: ['title'], locales: ['fr'] }, [SAME_ROLE]),
      ];

      expect(
        isPermissionWithinCeiling(
          held,
          read({ fields: ['title'], locales: ['en', 'fr'] }, [IS_CREATOR, SAME_ROLE])
        )
      ).toBe(false);
      expect(
        isPermissionWithinCeiling(held, read({ fields: ['title'], locales: ['en'] }, [IS_CREATOR]))
      ).toBe(true);
    });

    it('drops a partially held permission as a whole', () => {
      expect(isPermissionWithinCeiling([titleAlways], read({ fields: ['title', 'body'] }))).toBe(
        false
      );
    });
  });

  describe('toEnforcedPermissions', () => {
    const USER = 'plugin::users-permissions.user';

    // Articles are localized (their layout lists `locales`), users are not
    const layout = {
      conditions: [],
      sections: {
        collectionTypes: {
          actions: [],
          subjects: [
            {
              uid: SUBJECT,
              label: 'Article',
              properties: [
                { label: 'Fields', value: 'fields' },
                { label: 'Locales', value: 'locales' },
              ],
            },
            { uid: USER, label: 'User', properties: [{ label: 'Fields', value: 'fields' }] },
          ],
        },
        singleTypes: { actions: [], subjects: [] },
        plugins: [],
        settings: [],
      },
    } as PermissionContracts.GetAll.Response['data'];

    it('reads a missing locales key on a localized subject as no locale', () => {
      const held = toEnforcedPermissions([read({ fields: ['title'] })], layout);

      expect(held).toEqual([read({ fields: ['title'], locales: [] })]);
      expect(isPermissionWithinCeiling(held, read({ fields: ['title'], locales: null }))).toBe(
        false
      );
      expect(isPermissionWithinCeiling(held, read({ fields: ['title'], locales: ['fr'] }))).toBe(
        false
      );
      expect(canTick(held, READ, SUBJECT, selection({}), 'locales', 'fr')).toBe(false);
      expect(canTick(held, READ, SUBJECT, selection({}), 'fields', 'title')).toBe(true);
    });

    it('keeps every locale, listed locales, and subjects that are not localized', () => {
      const permissions = [
        read({ fields: ['title'], locales: null }),
        read({ fields: ['title'], locales: ['en'] }),
        permission(READ, USER, { fields: ['username'] }),
        permission('plugin::upload.read', null),
      ];

      expect(toEnforcedPermissions(permissions, layout)).toEqual(permissions);
    });
  });

  describe('getActionSelection', () => {
    it('flattens the ticked properties and conditions of an action form', () => {
      expect(
        getActionSelection({
          properties: {
            fields: { title: true, body: false, seo: { title: true, description: false } },
            locales: { en: true, fr: false },
          },
          conditions: { [IS_CREATOR]: true, [SAME_ROLE]: false },
        })
      ).toEqual(selection({ fields: ['title', 'seo.title'], locales: ['en'] }, [IS_CREATOR]));
    });

    it('ignores the enabled switch and empty properties', () => {
      expect(
        getActionSelection({
          properties: { enabled: true, locales: { en: false } },
          conditions: {},
        })
      ).toEqual(selection({}));
      expect(getActionSelection(undefined)).toEqual(selection({}));
    });
  });

  describe('findActionForm', () => {
    it('looks the subject up in collection types and single types', () => {
      const modifiedData = {
        collectionTypes: { [SUBJECT]: { [READ]: 'collection' } },
        singleTypes: { 'api::home.home': { [READ]: 'single' } },
      };

      expect(findActionForm(modifiedData, SUBJECT, READ)).toBe('collection');
      expect(findActionForm(modifiedData, 'api::home.home', READ)).toBe('single');
      expect(findActionForm(modifiedData, 'api::other.other', READ)).toBeUndefined();
      expect(findActionForm(modifiedData, null, READ)).toBeUndefined();
    });
  });

  describe('isValueSelected', () => {
    it('matches a value or one of its nested fields', () => {
      const current = selection({ fields: ['seo.title'] });

      expect(isValueSelected(current, 'fields', 'seo.title')).toBe(true);
      expect(isValueSelected(current, 'fields', 'seo')).toBe(true);
      expect(isValueSelected(current, 'fields', 'title')).toBe(false);
      expect(isValueSelected(current, 'locales', 'en')).toBe(false);
    });
  });

  describe('canTick', () => {
    it('rejects a value that no matching permission holds', () => {
      expect(canTick([titleEn, bodyFr], READ, SUBJECT, selection({}), 'fields', 'seo')).toBe(false);
      expect(canTick([titleEn, bodyFr], CREATE, SUBJECT, selection({}), 'fields', 'title')).toBe(
        false
      );
    });

    it('does not mix the fields of one permission with the locales of another', () => {
      const held = [titleEn, bodyFr];

      // Nothing ticked yet: any held value goes
      expect(canTick(held, READ, SUBJECT, selection({}), 'fields', 'title')).toBe(true);
      expect(canTick(held, READ, SUBJECT, selection({}), 'locales', 'fr')).toBe(true);

      // `title` is ticked: only `en` can follow, and `body` cannot join it
      const title = selection({ fields: ['title'] });
      expect(canTick(held, READ, SUBJECT, title, 'locales', 'en')).toBe(true);
      expect(canTick(held, READ, SUBJECT, title, 'locales', 'fr')).toBe(false);
      expect(canTick(held, READ, SUBJECT, title, 'fields', 'body')).toBe(true);

      // `title` and `en` are ticked: `body` and `fr` are out
      const titleOnEn = selection({ fields: ['title'], locales: ['en'] });
      expect(canTick(held, READ, SUBJECT, titleOnEn, 'fields', 'body')).toBe(false);
      expect(canTick(held, READ, SUBJECT, titleOnEn, 'locales', 'fr')).toBe(false);
    });

    it('still allows unions on one dimension', () => {
      expect(
        canTick(
          [titleAlways, read({ fields: ['body'] })],
          READ,
          SUBJECT,
          selection({ fields: ['title'] }),
          'fields',
          'body'
        )
      ).toBe(true);
      expect(
        canTick(
          [titleEn, read({ fields: ['title'], locales: ['fr'] })],
          READ,
          SUBJECT,
          selection({ fields: ['title'], locales: ['en'] }),
          'locales',
          'fr'
        )
      ).toBe(true);
    });

    it('keeps the selected conditions covered', () => {
      const held = [titleAlways, bodyIfCreator];

      expect(canTick(held, READ, SUBJECT, selection({ fields: ['title'] }), 'fields', 'body')).toBe(
        true
      );
      expect(
        canTick(
          held,
          READ,
          SUBJECT,
          selection({ fields: ['title'] }, [IS_CREATOR]),
          'fields',
          'body'
        )
      ).toBe(true);
      expect(
        canTick(
          held,
          READ,
          SUBJECT,
          selection({ fields: ['title'] }, [SAME_ROLE]),
          'fields',
          'body'
        )
      ).toBe(false);
    });
  });

  describe('getAllowedConditions', () => {
    it('is undefined for super admins', () => {
      expect(getAllowedConditions(undefined, READ, SUBJECT)).toBeUndefined();
    });

    it('is undefined when an unconditional permission covers the selection', () => {
      const held = [titleAlways, bodyIfCreator];

      expect(
        getAllowedConditions(held, READ, SUBJECT, selection({ fields: ['title'] }))
      ).toBeUndefined();
      expect(getAllowedConditions(held, READ, SUBJECT, selection({}))).toBeUndefined();
    });

    it('lists the conditions under which every combination is covered', () => {
      const held = [titleAlways, bodyIfCreator];

      expect(getAllowedConditions(held, READ, SUBJECT, selection({ fields: ['body'] }))).toEqual([
        IS_CREATOR,
      ]);
      expect(
        getAllowedConditions(held, READ, SUBJECT, selection({ fields: ['title', 'body'] }))
      ).toEqual([IS_CREATOR]);
    });

    it('is the union of the conditions held on the same selection', () => {
      const held = [read({}, [IS_CREATOR]), read({}, [SAME_ROLE])];

      expect(getAllowedConditions(held, READ, SUBJECT, selection({ fields: ['title'] }))).toEqual([
        IS_CREATOR,
        SAME_ROLE,
      ]);
    });

    it('drops a condition held on another locale only', () => {
      const held = [
        read({ fields: ['title'], locales: ['en'] }, [IS_CREATOR]),
        read({ fields: ['title'], locales: ['fr'] }, [SAME_ROLE]),
      ];

      expect(
        getAllowedConditions(held, READ, SUBJECT, selection({ fields: ['title'], locales: ['en'] }))
      ).toEqual([IS_CREATOR]);
      expect(
        getAllowedConditions(
          held,
          READ,
          SUBJECT,
          selection({ fields: ['title'], locales: ['en', 'fr'] })
        )
      ).toEqual([]);
    });

    it('works without properties for plugin and settings permissions', () => {
      const held = [permission('plugin::i18n.locale.create', null, {}, [IS_CREATOR])];

      expect(getAllowedConditions(held, 'plugin::i18n.locale.create', null)).toEqual([IS_CREATOR]);
      expect(getAllowedConditions(held, 'plugin::i18n.locale.read', null)).toEqual([]);
    });
  });

  describe('createBulkPermissionChecker', () => {
    const actionForm = {
      properties: {
        fields: { title: false, body: false },
        locales: { en: false, fr: false },
      },
      conditions: { [IS_CREATOR]: false },
    };

    const tickAll = (userPermissions: AuthPermission[] | undefined, form = actionForm) =>
      updateValuesWithPermissions(
        form,
        true,
        createBulkPermissionChecker({
          userPermissions,
          action: READ,
          subject: SUBJECT,
          actionForm: form,
          scope: form,
          scopePath: [],
          value: true,
        })
      );

    it('is undefined for super admins', () => {
      expect(
        createBulkPermissionChecker({
          userPermissions: undefined,
          action: READ,
          subject: SUBJECT,
          actionForm,
          scope: actionForm,
          scopePath: [],
          value: true,
        })
      ).toBeUndefined();
      expect(tickAll(undefined).properties).toEqual({
        fields: { title: true, body: true },
        locales: { en: true, fr: true },
      });
    });

    it('ticks everything the user holds when nothing conflicts', () => {
      expect(tickAll([read({ locales: ['en', 'fr'] })]).properties).toEqual({
        fields: { title: true, body: true },
        locales: { en: true, fr: true },
      });
      expect(tickAll([titleAlways, read({ fields: ['body'] })]).properties).toEqual({
        fields: { title: true, body: true },
        locales: { en: true, fr: true },
      });
    });

    it('anchors on one permission instead of mixing two', () => {
      expect(tickAll([titleEn, bodyFr]).properties).toEqual({
        fields: { title: true, body: false },
        locales: { en: true, fr: false },
      });
      // The widest permission wins
      expect(
        tickAll([titleEn, read({ fields: ['body'], locales: ['en', 'fr'] })]).properties
      ).toEqual({
        fields: { title: false, body: true },
        locales: { en: true, fr: true },
      });
    });

    it('extends the current selection rather than replacing it', () => {
      const form = {
        ...actionForm,
        properties: { ...actionForm.properties, locales: { en: false, fr: true } },
      };

      expect(tickAll([titleEn, bodyFr], form).properties).toEqual({
        fields: { title: false, body: true },
        locales: { en: false, fr: true },
      });
    });

    it('checks a scoped path within the action form', () => {
      const scope = { en: false, fr: false };
      const checker = createBulkPermissionChecker({
        userPermissions: [titleEn, bodyFr],
        action: READ,
        subject: SUBJECT,
        actionForm: {
          ...actionForm,
          properties: { ...actionForm.properties, fields: { title: true, body: false } },
        },
        scope,
        scopePath: ['properties', 'locales'],
        value: true,
      })!;

      expect(updateValuesWithPermissions(scope, true, checker)).toEqual({ en: true, fr: false });
    });

    it('lets the user untick any value they hold', () => {
      const ticked = {
        properties: { fields: { title: true, body: true }, locales: { en: true, fr: true } },
        conditions: {},
      };
      const result = updateValuesWithPermissions(
        ticked,
        false,
        createBulkPermissionChecker({
          userPermissions: [titleEn],
          action: READ,
          subject: SUBJECT,
          actionForm: ticked,
          scope: ticked,
          scopePath: [],
          value: false,
        })
      );

      expect(result.properties).toEqual({
        fields: { title: false, body: true },
        locales: { en: false, fr: true },
      });
    });

    it('treats the enabled switch as the action itself', () => {
      const form = { properties: { enabled: false }, conditions: {} };
      const checker = createBulkPermissionChecker({
        userPermissions: [permission('plugin::i18n.locale.create', null)],
        action: 'plugin::i18n.locale.create',
        subject: null,
        actionForm: form,
        scope: form,
        scopePath: [],
        value: true,
      })!;

      expect(checker(['properties', 'enabled'])).toBe(true);
    });
  });

  describe('createSubjectBulkPermissionChecker', () => {
    it('anchors every action separately', () => {
      const subjectForm = {
        [READ]: {
          properties: { fields: { title: false, body: false }, locales: { en: false, fr: false } },
          conditions: {},
        },
        [CREATE]: {
          properties: { fields: { title: false, body: false }, locales: { en: false, fr: false } },
          conditions: {},
        },
      };
      const checker = createSubjectBulkPermissionChecker({
        userPermissions: [
          titleEn,
          bodyFr,
          permission(CREATE, SUBJECT, { fields: ['body'], locales: ['fr'] }),
        ],
        subject: SUBJECT,
        subjectForm,
        value: true,
      });

      expect(updateValuesWithPermissions(subjectForm, true, checker)).toEqual({
        [READ]: {
          properties: { fields: { title: true, body: false }, locales: { en: true, fr: false } },
          conditions: {},
        },
        [CREATE]: {
          properties: { fields: { title: false, body: true }, locales: { en: false, fr: true } },
          conditions: {},
        },
      });
    });

    it('checks plugin and settings actions by their id', () => {
      const subjectForm = {
        'plugin::i18n.locale.create': { properties: { enabled: false }, conditions: {} },
        'plugin::i18n.locale.read': { properties: { enabled: false }, conditions: {} },
      };
      const checker = createSubjectBulkPermissionChecker({
        userPermissions: [permission('plugin::i18n.locale.create', null)],
        subject: null,
        subjectForm,
        value: true,
      });

      expect(updateValuesWithPermissions(subjectForm, true, checker)).toEqual({
        'plugin::i18n.locale.create': { properties: { enabled: true }, conditions: {} },
        'plugin::i18n.locale.read': { properties: { enabled: false }, conditions: {} },
      });
    });

    it('is undefined for super admins', () => {
      expect(
        createSubjectBulkPermissionChecker({
          userPermissions: undefined,
          subject: SUBJECT,
          subjectForm: {},
          value: true,
        })
      ).toBeUndefined();
    });
  });
});
