import formatSettingsPermissionsToAPI, {
  createConditionsArray,
  createPermission,
  createPermissionsArrayFromCategory,
} from '../formatSettingsPermissionsToAPI';

describe('ADMIN | COMPONENTS | Roles | Permissions | utils', () => {
  describe('createConditionsArray', () => {
    it('should return an empty array when all conditions are falsy', () => {
      const conditions = {
        test: false,
        ok: false,
      };

      expect(createConditionsArray(conditions)).toEqual([]);
    });

    it('should return an array of condition names when the conditions are truthy', () => {
      const conditions = {
        foo: true,
        bar: false,
        batz: true,
      };
      const expected = ['foo', 'batz'];

      expect(createConditionsArray(conditions)).toEqual(expected);
    });
  });

  describe('createPermission', () => {
    it('should return a permission object', () => {
      const permission = [
        'read',
        { properties: { enabled: true }, conditions: { foo: false, bar: true } },
      ];
      const expected = { action: 'read', subject: null, conditions: ['bar'], properties: {} };

      expect(createPermission(permission)).toEqual(expected);
    });
  });

  describe('createPermissionsArrayFromCategory', () => {
    it('should return an array of permissions containing only the enabled permissions', () => {
      const permissions = {
        settings: {
          'plugin::documentation.settings.update': {
            properties: {
              enabled: false,
            },
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
          'plugin::documentation.settings.regenerate': {
            properties: {
              enabled: true,
            },
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
        },
      };

      const expected = [
        {
          action: 'plugin::documentation.settings.regenerate',
          subject: null,
          conditions: [],
          properties: {},
        },
      ];

      expect(createPermissionsArrayFromCategory(permissions)).toEqual(expected);
    });
  });

  describe('formatSettingsPermissionsToAPI', () => {
    it('should return an array', () => {
      expect(formatSettingsPermissionsToAPI({})).toEqual([]);
    });

    it('should return an array empty array when no permissions is enabled', () => {
      const settingsPermissions = {
        'plugin::content-type-builder': {
          general: {
            'plugin::content-type-builder.read': {
              properties: {
                enabled: false,
              },
              conditions: {
                'admin::is-creator': false,
                'admin::has-same-role-as-creator': false,
              },
            },
          },
        },
        'plugin::documentation': {
          general: {
            'plugin::documentation.read': {
              properties: {
                enabled: false,
              },
              conditions: {
                'admin::is-creator': false,
                'admin::has-same-role-as-creator': false,
              },
            },
          },
          settings: {
            'plugin::documentation.settings.update': {
              properties: {
                enabled: false,
              },
              conditions: {
                'admin::is-creator': false,
                'admin::has-same-role-as-creator': false,
              },
            },
            'plugin::documentation.settings.regenerate': {
              properties: {
                enabled: false,
              },
              conditions: {
                'admin::is-creator': false,
                'admin::has-same-role-as-creator': false,
              },
            },
          },
        },
      };

      expect(formatSettingsPermissionsToAPI(settingsPermissions)).toEqual([]);
    });

    it('should return an array empty array of permissions when the permissions are enabled', () => {
      const settingsPermissions = {
        'plugin::content-type-builder': {
          general: {
            'plugin::content-type-builder.read': {
              properties: {
                enabled: false,
              },
              conditions: {
                'admin::is-creator': false,
                'admin::has-same-role-as-creator': false,
              },
            },
          },
        },
        'plugin::documentation': {
          general: {
            'plugin::documentation.read': {
              properties: {
                enabled: true,
              },
              conditions: {
                'admin::is-creator': true,
                'admin::has-same-role-as-creator': false,
              },
            },
          },
          settings: {
            'plugin::documentation.settings.update': {
              properties: {
                enabled: true,
              },
              conditions: {
                'admin::is-creator': true,
                'admin::has-same-role-as-creator': true,
              },
            },
            'plugin::documentation.settings.regenerate': {
              properties: {
                enabled: true,
              },
              conditions: {
                'admin::is-creator': false,
                'admin::has-same-role-as-creator': false,
              },
            },
          },
        },
      };

      const expected = [
        {
          action: 'plugin::documentation.read',
          conditions: ['admin::is-creator'],
          subject: null,
          properties: {},
        },
        {
          action: 'plugin::documentation.settings.update',
          conditions: ['admin::is-creator', 'admin::has-same-role-as-creator'],
          subject: null,
          properties: {},
        },
        {
          action: 'plugin::documentation.settings.regenerate',
          conditions: [],
          subject: null,
          properties: {},
        },
      ];

      expect(formatSettingsPermissionsToAPI(settingsPermissions)).toEqual(expected);
    });
  });
});
