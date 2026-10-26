import {
  coversAtom,
  coversCondition,
  coversPropertyValue,
  findMatchingPermissions,
  getInheritedConditions,
  getRestrictedProperties,
  isPermissionWithinCeiling,
  toEnforcedPermissions,
} from '../ceiling';

const READ = 'plugin::content-manager.explorer.read';
const CREATE = 'plugin::content-manager.explorer.create';
const ARTICLE = 'api::article.article';
const AUTHOR = 'api::author.author';
const IS_CREATOR = 'admin::is-creator';
const SAME_ROLE = 'admin::has-same-role-as-creator';

describe('Permission ceiling', () => {
  describe('toEnforcedPermissions', () => {
    // Articles are localized, authors are not
    const enforceLocales = (localizedSubjects: string[] = [ARTICLE]) => ({
      isLocalesEnforced: (permission: { subject?: string | null }) =>
        !!permission.subject && localizedSubjects.includes(permission.subject),
      isConditionRegistered: () => true,
    });

    describe('locales', () => {
      test('Reads a missing locales key as no locale where locales are enforced', () => {
        expect(
          toEnforcedPermissions(
            [
              { action: READ, subject: ARTICLE, properties: { fields: ['title'] } },
              { action: READ, subject: ARTICLE, properties: null },
              { action: READ, subject: ARTICLE },
            ],
            enforceLocales()
          )
        ).toEqual([
          { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: [] } },
          { action: READ, subject: ARTICLE, properties: { locales: [] } },
          { action: READ, subject: ARTICLE, properties: { locales: [] } },
        ]);
      });

      test('Keeps every locale (null) and listed locales', () => {
        const permissions = [
          { action: READ, subject: ARTICLE, properties: { locales: null } },
          { action: READ, subject: ARTICLE, properties: { locales: ['en'] } },
          { action: READ, subject: ARTICLE, properties: { locales: [] } },
        ];

        expect(toEnforcedPermissions(permissions, enforceLocales())).toEqual(permissions);
      });

      test('Leaves permissions where locales are not enforced as they are', () => {
        const permissions = [
          { action: READ, subject: AUTHOR, properties: { fields: ['name'] } },
          { action: 'admin::roles.read' },
        ];

        expect(toEnforcedPermissions(permissions, enforceLocales())).toEqual(permissions);
        // A super admin holder: the caller reports nothing as enforced
        expect(
          toEnforcedPermissions([{ action: READ, subject: ARTICLE }], enforceLocales([]))
        ).toEqual([{ action: READ, subject: ARTICLE }]);
      });

      test('Does not mutate its input', () => {
        const permission = { action: READ, subject: ARTICLE, properties: { fields: ['title'] } };

        toEnforcedPermissions([permission], enforceLocales());

        expect(permission).toEqual({
          action: READ,
          subject: ARTICLE,
          properties: { fields: ['title'] },
        });
      });

      describe('in the ceiling', () => {
        const held = toEnforcedPermissions(
          [{ action: READ, subject: ARTICLE, properties: { fields: ['title'] } }],
          enforceLocales()
        );
        const request = (properties: Record<string, unknown>) => ({
          action: READ,
          subject: ARTICLE,
          properties,
        });

        test('A held permission with no locales key covers no locale', () => {
          expect(
            isPermissionWithinCeiling(request({ fields: ['title'], locales: null }), held)
          ).toBe(false);
          expect(
            isPermissionWithinCeiling(request({ fields: ['title'], locales: ['fr'] }), held)
          ).toBe(false);
        });

        test('Still checks the fields of a request for no locale', () => {
          expect(isPermissionWithinCeiling(request({ fields: ['title'], locales: [] }), held)).toBe(
            true
          );
          expect(isPermissionWithinCeiling(request({ fields: ['body'], locales: [] }), held)).toBe(
            false
          );
        });

        test('Inherits nothing for every locale, and no condition for no locale', () => {
          expect(getInheritedConditions(request({ fields: ['title'], locales: null }), held)).toBe(
            null
          );

          const [noLocale] = toEnforcedPermissions(
            [request({ fields: ['title'] })],
            enforceLocales()
          );

          expect(getInheritedConditions(noLocale, held)).toEqual([]);
        });
      });
    });
  });

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

  describe('getRestrictedProperties', () => {
    test('Is the union of the properties on the request and the matching permissions', () => {
      expect(
        getRestrictedProperties({ action: READ, properties: { locales: ['en'] } }, [
          { action: READ, properties: { fields: ['title'] } },
          { action: READ, properties: { fields: ['body'], locales: null } },
          { action: READ },
        ])
      ).toEqual(['locales', 'fields']);
    });
  });

  describe('coversPropertyValue', () => {
    test('An unrestricted property covers every value, including no restriction', () => {
      expect(coversPropertyValue({ action: READ }, 'fields', 'title')).toBe(true);
      expect(coversPropertyValue({ action: READ, properties: {} }, 'fields', null)).toBe(true);
      expect(
        coversPropertyValue({ action: READ, properties: { locales: null } }, 'locales', 'fr')
      ).toBe(true);
    });

    test('A restricted property covers its listed values only', () => {
      const held = { action: READ, properties: { fields: ['title', 'seo'] } };

      expect(coversPropertyValue(held, 'fields', 'title')).toBe(true);
      expect(coversPropertyValue(held, 'fields', 'seo.description')).toBe(true);
      expect(coversPropertyValue(held, 'fields', 'seoTitle')).toBe(false);
      expect(coversPropertyValue(held, 'fields', 'body')).toBe(false);
      expect(coversPropertyValue(held, 'fields', null)).toBe(false);
    });

    test('Only applies the nested rule to fields', () => {
      expect(
        coversPropertyValue({ action: READ, properties: { locales: ['en'] } }, 'locales', 'en.US')
      ).toBe(false);
    });

    test('An empty list covers no value', () => {
      expect(
        coversPropertyValue({ action: READ, properties: { locales: [] } }, 'locales', 'en')
      ).toBe(false);
    });
  });

  describe('coversCondition', () => {
    test('An unconditional permission covers any condition and none', () => {
      expect(coversCondition({ action: READ }, IS_CREATOR)).toBe(true);
      expect(coversCondition({ action: READ, conditions: [] }, null)).toBe(true);
    });

    test('A conditional permission covers its own conditions only', () => {
      const held = { action: READ, conditions: [IS_CREATOR] };

      expect(coversCondition(held, IS_CREATOR)).toBe(true);
      expect(coversCondition(held, SAME_ROLE)).toBe(false);
      expect(coversCondition(held, null)).toBe(false);
    });
  });

  describe('coversAtom', () => {
    test('Every dimension of the atom must be covered by the same permission', () => {
      const held = {
        action: READ,
        properties: { fields: ['title'], locales: ['en'] },
        conditions: [IS_CREATOR],
      };

      expect(
        coversAtom(held, { properties: { fields: 'title', locales: 'en' }, condition: IS_CREATOR })
      ).toBe(true);
      expect(
        coversAtom(held, { properties: { fields: 'title', locales: 'fr' }, condition: IS_CREATOR })
      ).toBe(false);
      expect(
        coversAtom(held, { properties: { fields: 'body', locales: 'en' }, condition: IS_CREATOR })
      ).toBe(false);
      expect(
        coversAtom(held, { properties: { fields: 'title', locales: 'en' }, condition: null })
      ).toBe(false);
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

      test('Allows a property restricted on the request only when the holder is unrestricted', () => {
        const held = [{ action: READ, subject: ARTICLE, properties: { fields: ['title'] } }];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: ['en'] } },
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
    });

    describe('conditions', () => {
      test('Allows any conditions when the permission is held unconditionally', () => {
        const held = [
          { action: READ, subject: ARTICLE, conditions: [IS_CREATOR] },
          { action: READ, subject: ARTICLE, conditions: [] },
        ];

        expect(isPermissionWithinCeiling({ action: READ, subject: ARTICLE }, held)).toBe(true);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, conditions: [IS_CREATOR, SAME_ROLE] },
            held
          )
        ).toBe(true);
      });

      test('Allows a non-empty subset of the held conditions', () => {
        const held = [
          { action: READ, subject: ARTICLE, conditions: [IS_CREATOR, SAME_ROLE] },
          { action: CREATE, subject: ARTICLE, conditions: [IS_CREATOR] },
        ];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, conditions: [IS_CREATOR, SAME_ROLE] },
            held
          )
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, conditions: [IS_CREATOR] },
            held
          )
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(
            { action: CREATE, subject: ARTICLE, conditions: [IS_CREATOR, SAME_ROLE] },
            held
          )
        ).toBe(false);
      });

      test('Rejects no conditions when the permission is only held with conditions', () => {
        const held = [{ action: READ, subject: ARTICLE, conditions: [IS_CREATOR] }];

        expect(isPermissionWithinCeiling({ action: READ, subject: ARTICLE }, held)).toBe(false);
        expect(
          isPermissionWithinCeiling({ action: READ, subject: ARTICLE, conditions: [] }, held)
        ).toBe(false);
      });

      test('Rejects a condition that is not held', () => {
        const held = [{ action: READ, subject: ARTICLE, conditions: [IS_CREATOR] }];

        expect(
          isPermissionWithinCeiling(
            { action: READ, subject: ARTICLE, conditions: [IS_CREATOR, SAME_ROLE] },
            held
          )
        ).toBe(false);
      });
    });

    /**
     * The engine registers every held permission as its own rule, so a requested combination
     * must be covered by a single held permission. Unions on one dimension across held
     * permissions are still fine, since the engine grants the same thing through two rules.
     */
    describe('combinations', () => {
      const titleEn = {
        action: READ,
        subject: ARTICLE,
        properties: { fields: ['title'], locales: ['en'] },
      };
      const bodyFr = {
        action: READ,
        subject: ARTICLE,
        properties: { fields: ['body'], locales: ['fr'] },
      };
      const titleFr = {
        action: READ,
        subject: ARTICLE,
        properties: { fields: ['title'], locales: ['fr'] },
      };
      const titleAlways = { action: READ, subject: ARTICLE, properties: { fields: ['title'] } };
      const bodyAlways = { action: READ, subject: ARTICLE, properties: { fields: ['body'] } };
      const bodyIfCreator = {
        action: READ,
        subject: ARTICLE,
        properties: { fields: ['body'] },
        conditions: [IS_CREATOR],
      };

      const request = (properties: Record<string, unknown>, conditions?: string[]) => ({
        action: READ,
        subject: ARTICLE,
        properties,
        conditions,
      });

      test('Does not mix the fields of one permission with the locales of another', () => {
        const held = [titleEn, bodyFr];

        expect(
          isPermissionWithinCeiling(request({ fields: ['title'], locales: ['fr'] }), held)
        ).toBe(false);
        expect(
          isPermissionWithinCeiling(request({ fields: ['body'], locales: ['en'] }), held)
        ).toBe(false);
        expect(
          isPermissionWithinCeiling(
            request({ fields: ['title', 'body'], locales: ['en', 'fr'] }),
            held
          )
        ).toBe(false);
        expect(
          isPermissionWithinCeiling(request({ fields: ['title'], locales: ['en'] }), held)
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(request({ fields: ['body'], locales: ['fr'] }), held)
        ).toBe(true);
      });

      test('Does not lift the conditions of one permission with an unconditional one on other fields', () => {
        const held = [titleAlways, bodyIfCreator];

        expect(isPermissionWithinCeiling(request({ fields: ['body'] }), held)).toBe(false);
        expect(isPermissionWithinCeiling(request({ fields: ['title', 'body'] }), held)).toBe(false);
        expect(isPermissionWithinCeiling(request({ fields: ['title'] }), held)).toBe(true);
        expect(isPermissionWithinCeiling(request({ fields: ['body'] }, [IS_CREATOR]), held)).toBe(
          true
        );
        // The unconditional `title` covers `title` under any condition
        expect(
          isPermissionWithinCeiling(request({ fields: ['title', 'body'] }, [IS_CREATOR]), held)
        ).toBe(true);
      });

      test('Still allows a union of fields across unrestricted permissions', () => {
        expect(
          isPermissionWithinCeiling(request({ fields: ['title', 'body'] }), [
            titleAlways,
            bodyAlways,
          ])
        ).toBe(true);
      });

      test('Still allows a union of locales for the same field', () => {
        const held = [titleEn, titleFr];

        expect(
          isPermissionWithinCeiling(request({ fields: ['title'], locales: ['en', 'fr'] }), held)
        ).toBe(true);
        // Unrestricted locales would be broader than either held permission
        expect(isPermissionWithinCeiling(request({ fields: ['title'], locales: null }), held)).toBe(
          false
        );
        expect(isPermissionWithinCeiling(request({ fields: ['title'] }), held)).toBe(false);
      });

      test('Still allows a union of conditions for the same fields', () => {
        const held = [
          { ...titleAlways, conditions: [IS_CREATOR] },
          { ...titleAlways, conditions: [SAME_ROLE] },
        ];

        expect(
          isPermissionWithinCeiling(request({ fields: ['title'] }, [IS_CREATOR, SAME_ROLE]), held)
        ).toBe(true);
        expect(isPermissionWithinCeiling(request({ fields: ['title'] }), held)).toBe(false);
      });

      test('Does not mix a condition held on one locale with another locale', () => {
        const held = [
          { ...titleEn, conditions: [IS_CREATOR] },
          { ...titleFr, conditions: [SAME_ROLE] },
        ];

        expect(
          isPermissionWithinCeiling(
            request({ fields: ['title'], locales: ['en', 'fr'] }, [IS_CREATOR, SAME_ROLE]),
            held
          )
        ).toBe(false);
        expect(
          isPermissionWithinCeiling(
            request({ fields: ['title'], locales: ['en'] }, [IS_CREATOR]),
            held
          )
        ).toBe(true);
      });

      test('Covers nested fields through the parent of a single permission', () => {
        const held = [
          { action: READ, subject: ARTICLE, properties: { fields: ['seo'], locales: ['en'] } },
        ];

        expect(
          isPermissionWithinCeiling(request({ fields: ['seo.title'], locales: ['en'] }), held)
        ).toBe(true);
        expect(
          isPermissionWithinCeiling(request({ fields: ['seo.title'], locales: ['fr'] }), held)
        ).toBe(false);
      });

      test('Does not need a property listing no value to be covered', () => {
        expect(
          isPermissionWithinCeiling(request({ fields: ['title'], locales: [] }), [titleEn])
        ).toBe(true);
      });

      test('Still checks the other properties when a property lists no value', () => {
        expect(
          isPermissionWithinCeiling(request({ fields: ['body'], locales: [] }), [titleEn])
        ).toBe(false);
        expect(isPermissionWithinCeiling(request({ locales: [] }), [titleEn])).toBe(false);
      });

      test('Still checks the conditions when a property lists no value', () => {
        const titleEnIfCreator = { ...titleEn, conditions: [IS_CREATOR] };

        expect(
          isPermissionWithinCeiling(request({ fields: ['title'], locales: [] }), [titleEnIfCreator])
        ).toBe(false);
        expect(
          isPermissionWithinCeiling(request({ fields: ['title'], locales: [] }, [IS_CREATOR]), [
            titleEnIfCreator,
          ])
        ).toBe(true);
      });

      test('Still allows requesting no fields alongside a property listing no value', () => {
        expect(isPermissionWithinCeiling(request({ fields: [], locales: [] }), [titleEn])).toBe(
          true
        );
      });
    });
  });

  describe('getInheritedConditions', () => {
    type Props = Record<string, unknown> | undefined;

    const perm = (properties: Props, conditions: string[] = [], action = READ) => ({
      action,
      subject: ARTICLE,
      ...(properties === undefined ? {} : { properties }),
      conditions,
    });

    // The owner from the review: `title` on `en` unconditionally, `body` on `fr` if creator
    const reviewOwner = [
      perm({ fields: ['title'], locales: ['en'] }),
      perm({ fields: ['body'], locales: ['fr'] }, [IS_CREATOR]),
    ];

    const cases: Array<
      [string, ReturnType<typeof perm>[], ReturnType<typeof perm>, string[] | null]
    > = [
      [
        'Rejects a field on a locale held by another permission',
        reviewOwner,
        perm({ fields: ['title'], locales: ['fr'] }),
        null,
      ],
      [
        'Inherits no condition from an unconditional holder',
        reviewOwner,
        perm({ fields: ['title'], locales: ['en'] }),
        [],
      ],
      [
        'Inherits the conditions of the only holder',
        reviewOwner,
        perm({ fields: ['body'], locales: ['fr'] }),
        [IS_CREATOR],
      ],
      [
        'Rejects every field on every locale when no single permission holds them',
        reviewOwner,
        perm({ fields: ['title', 'body'], locales: ['en', 'fr'] }),
        null,
      ],
      [
        'Rejects a field with no holder on the locale',
        reviewOwner,
        perm({ fields: ['title', 'body'], locales: ['en'] }),
        null,
      ],
      [
        'Inherits no condition when unconditional holders cover every field',
        [perm({ fields: ['title'] }), perm({ fields: ['body'] })],
        perm({ fields: ['title', 'body'] }),
        [],
      ],
      [
        'Rejects fields whose holders share no condition',
        [perm({ fields: ['title'] }, [IS_CREATOR]), perm({ fields: ['body'] }, [SAME_ROLE])],
        perm({ fields: ['title', 'body'] }),
        null,
      ],
      [
        'Inherits only the conditions every field is held under',
        [
          perm({ fields: ['title'] }, [IS_CREATOR, SAME_ROLE]),
          perm({ fields: ['body'] }, [SAME_ROLE]),
        ],
        perm({ fields: ['title', 'body'] }),
        [SAME_ROLE],
      ],
      [
        'Inherits the condition of the conditional holder alongside an unconditional one',
        [perm({ fields: ['title'] }), perm({ fields: ['body'] }, [IS_CREATOR])],
        perm({ fields: ['title', 'body'] }),
        [IS_CREATOR],
      ],
      [
        'Ignores the conditions on the request',
        [perm({ fields: ['title'] }, [IS_CREATOR])],
        perm({ fields: ['title'] }, []),
        [IS_CREATOR],
      ],
      [
        'Covers a nested field by its parent',
        [perm({ fields: ['seo'] })],
        perm({ fields: ['seo.title'] }),
        [],
      ],
      [
        'Rejects omitted fields against a field-restricted holder',
        [perm({ fields: ['title'] })],
        perm(undefined),
        null,
      ],
      [
        'Rejects omitted locales against a locale-restricted holder',
        [perm({ locales: ['en'] })],
        perm({ fields: ['title'] }),
        null,
      ],
      [
        'Does not treat an empty locale list as a dimension',
        [perm({ locales: ['en'] })],
        perm({ fields: ['title'], locales: [] }),
        [],
      ],
      [
        'Rejects against a holder with no fields',
        [perm({ fields: [] })],
        perm({ fields: ['title'] }),
        null,
      ],
      [
        'Inherits no condition for a request with no fields',
        [perm({ fields: ['title'] }, [IS_CREATOR], CREATE)],
        perm({ fields: [] }),
        [],
      ],
      [
        'Rejects without a matching action',
        [perm({ fields: ['title'] }, [], CREATE)],
        perm({ fields: ['title'] }),
        null,
      ],
    ];

    test.each(cases)('%s', (_, held, requested, expected) => {
      expect(getInheritedConditions(requested, held)).toEqual(expected);
    });

    test.each(cases.filter(([, , , expected]) => expected !== null))(
      'Stays within the ceiling with the inherited conditions: %s',
      (_, held, requested) => {
        const conditions = getInheritedConditions(requested, held);

        expect(isPermissionWithinCeiling({ ...requested, conditions }, held)).toBe(true);
      }
    );
  });
});
