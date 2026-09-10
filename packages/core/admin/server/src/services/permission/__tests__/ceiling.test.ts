import { checkPermissionsWithinCeiling, formatCeilingMessage } from '../ceiling';

const perm = (
  action: string,
  subject: string | null = null,
  properties: Record<string, unknown> = {},
  conditions: string[] = []
) => ({ action, subject, properties, conditions });

describe('permission ceiling', () => {
  describe('action and subject', () => {
    test('a permission the caller does not hold is refused', () => {
      const result = checkPermissionsWithinCeiling(
        [perm('plugin::content-manager.explorer.read', 'api::article.article')],
        [perm('plugin::content-manager.explorer.publish', 'api::article.article')]
      );
      expect(result).toEqual({
        allowed: false,
        violations: [
          {
            action: 'plugin::content-manager.explorer.publish',
            subject: 'api::article.article',
            reason: 'action-not-held',
          },
        ],
      });
    });

    test('subjects are compared with null and undefined as the same thing', () => {
      const result = checkPermissionsWithinCeiling(
        [perm('admin::roles.read', undefined as never)],
        [perm('admin::roles.read', null)]
      );
      expect(result.allowed).toBe(true);
    });

    test('every violation is reported, not only the first', () => {
      const result = checkPermissionsWithinCeiling(
        [],
        [perm('admin::roles.read'), perm('admin::roles.update')]
      );
      expect(result.violations).toHaveLength(2);
    });
  });

  describe('fields', () => {
    const ceiling = [
      perm('plugin::content-manager.explorer.update', 'api::article.article', {
        fields: ['title', 'seo'],
      }),
    ];

    test('a subset of the fields is allowed, including nested component fields', () => {
      expect(
        checkPermissionsWithinCeiling(ceiling, [
          perm('plugin::content-manager.explorer.update', 'api::article.article', {
            fields: ['title', 'seo.description'],
          }),
        ]).allowed
      ).toBe(true);
    });

    test('a field the caller lacks is refused', () => {
      const result = checkPermissionsWithinCeiling(ceiling, [
        perm('plugin::content-manager.explorer.update', 'api::article.article', {
          fields: ['title', 'body'],
        }),
      ]);
      expect(result.violations).toEqual([
        expect.objectContaining({ reason: 'fields-exceed', details: { fields: ['body'] } }),
      ]);
    });

    test('omitting fields against a field-restricted caller is refused (it would mean all)', () => {
      const result = checkPermissionsWithinCeiling(ceiling, [
        perm('plugin::content-manager.explorer.update', 'api::article.article', {}),
      ]);
      expect(result.violations).toEqual([expect.objectContaining({ reason: 'fields-required' })]);
    });

    test('a caller permission without fields grants every field', () => {
      expect(
        checkPermissionsWithinCeiling(
          [perm('plugin::content-manager.explorer.update', 'api::article.article')],
          [
            perm('plugin::content-manager.explorer.update', 'api::article.article', {
              fields: ['anything'],
            }),
          ]
        ).allowed
      ).toBe(true);
    });

    test('fields are unioned across several matching caller permissions', () => {
      expect(
        checkPermissionsWithinCeiling(
          [
            perm('plugin::content-manager.explorer.update', 'api::article.article', {
              fields: ['title'],
            }),
            perm('plugin::content-manager.explorer.update', 'api::article.article', {
              fields: ['body'],
            }),
          ],
          [
            perm('plugin::content-manager.explorer.update', 'api::article.article', {
              fields: ['title', 'body'],
            }),
          ]
        ).allowed
      ).toBe(true);
    });
  });

  describe('locales', () => {
    const ceiling = [
      perm('plugin::content-manager.explorer.read', 'api::article.article', {
        fields: ['title'],
        locales: ['en', 'fr'],
      }),
    ];

    test('a subset of locales is allowed, a foreign locale is refused', () => {
      expect(
        checkPermissionsWithinCeiling(ceiling, [
          perm('plugin::content-manager.explorer.read', 'api::article.article', {
            fields: ['title'],
            locales: ['fr'],
          }),
        ]).allowed
      ).toBe(true);
      expect(
        checkPermissionsWithinCeiling(ceiling, [
          perm('plugin::content-manager.explorer.read', 'api::article.article', {
            fields: ['title'],
            locales: ['de'],
          }),
        ]).violations
      ).toEqual([
        expect.objectContaining({ reason: 'locales-exceed', details: { locales: ['de'] } }),
      ]);
    });

    test('null locales against a locale-restricted caller is refused', () => {
      expect(
        checkPermissionsWithinCeiling(ceiling, [
          perm('plugin::content-manager.explorer.read', 'api::article.article', {
            fields: ['title'],
            locales: null,
          }),
        ]).violations
      ).toEqual([expect.objectContaining({ reason: 'locales-required' })]);
    });

    test('a caller with all locales (null) grants any locale', () => {
      expect(
        checkPermissionsWithinCeiling(
          [
            perm('plugin::content-manager.explorer.read', 'api::article.article', {
              locales: null,
            }),
          ],
          [
            perm('plugin::content-manager.explorer.read', 'api::article.article', {
              locales: ['de'],
            }),
          ]
        ).allowed
      ).toBe(true);
    });
  });

  describe('other properties', () => {
    test('an unknown property must equal the caller value', () => {
      const ceiling = [perm('some::action', null, { custom: { a: 1 } })];
      expect(
        checkPermissionsWithinCeiling(ceiling, [perm('some::action', null, { custom: { a: 1 } })])
          .allowed
      ).toBe(true);
      expect(
        checkPermissionsWithinCeiling(ceiling, [perm('some::action', null, { custom: { a: 2 } })])
          .violations
      ).toEqual([
        expect.objectContaining({ reason: 'property-mismatch', details: { property: 'custom' } }),
      ]);
    });
  });

  describe('conditions (OR-ed by the engine, so fewer conditions means broader access)', () => {
    const conditional = [perm('admin::roles.read', null, {}, ['admin::is-creator'])];

    test('an unconditional caller permission grants any conditions', () => {
      expect(
        checkPermissionsWithinCeiling(
          [perm('admin::roles.read')],
          [perm('admin::roles.read', null, {}, ['admin::is-creator', 'admin::has-same-role'])]
        ).allowed
      ).toBe(true);
    });

    test('a conditional caller permission refuses an unconditional request', () => {
      expect(
        checkPermissionsWithinCeiling(conditional, [perm('admin::roles.read')]).violations
      ).toEqual([expect.objectContaining({ reason: 'conditions-exceed' })]);
    });

    test('a conditional caller permission accepts the same conditions and refuses extra ones', () => {
      expect(
        checkPermissionsWithinCeiling(conditional, [
          perm('admin::roles.read', null, {}, ['admin::is-creator']),
        ]).allowed
      ).toBe(true);
      expect(
        checkPermissionsWithinCeiling(conditional, [
          perm('admin::roles.read', null, {}, ['admin::is-creator', 'admin::has-same-role']),
        ]).violations
      ).toEqual([
        expect.objectContaining({
          reason: 'conditions-exceed',
          details: { conditions: ['admin::has-same-role'] },
        }),
      ]);
    });

    test('conditions are unioned across several matching caller permissions', () => {
      expect(
        checkPermissionsWithinCeiling(
          [
            perm('admin::roles.read', null, {}, ['admin::is-creator']),
            perm('admin::roles.read', null, {}, ['admin::has-same-role']),
          ],
          [perm('admin::roles.read', null, {}, ['admin::has-same-role'])]
        ).allowed
      ).toBe(true);
    });
  });

  test('formatCeilingMessage lists every violation', () => {
    const message = formatCeilingMessage([
      { action: 'admin::roles.read', subject: null, reason: 'action-not-held' },
      {
        action: 'plugin::content-manager.explorer.update',
        subject: 'api::article.article',
        reason: 'fields-exceed',
        details: { fields: ['body'] },
      },
    ]);
    expect(message).toBe(
      'Cannot grant permissions that exceed your own: admin::roles.read, plugin::content-manager.explorer.update on api::article.article (fields: body)'
    );
  });
});
