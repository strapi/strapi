import { Permission } from '../../../../../../../../shared/contracts/shared';
import { formatPermissionsForAPI, findMatchingPermission } from '../permissions';

describe('permissions', () => {
  describe('findMatchingPermission', () => {
    const permissions: Permission[] = [
      {
        action: 'plugins::users-permissions.roles.create',
        subject: null,
        actionParameters: [],
        properties: {},
        conditions: [],
        id: 1,
        createdAt: '',
        updatedAt: '',
      },
      {
        action: 'plugins::users-permissions.roles.update',
        subject: null,
        actionParameters: [],
        properties: {},
        conditions: [],
        id: 2,
        createdAt: '',
        updatedAt: '',
      },
      {
        action: 'plugins::users-permissions.roles.delete',
        subject: null,
        actionParameters: [],
        properties: {},
        conditions: [],
        id: 3,
        createdAt: '',
        updatedAt: '',
      },
      {
        action: 'plugins::users-permissions.roles.create',
        subject: 'test',
        actionParameters: [],
        properties: {},
        conditions: [],
        id: 4,
        createdAt: '',
        updatedAt: '',
      },
      {
        action: 'plugins::users-permissions.roles.update',
        subject: 'test',
        actionParameters: [],
        properties: {},
        conditions: [],
        id: 5,
        createdAt: '',
        updatedAt: '',
      },
      {
        action: 'plugins::users-permissions.roles.delete',
        subject: 'test',
        actionParameters: [],
        properties: {},
        conditions: [],
        id: 6,
        createdAt: '',
        updatedAt: '',
      },
    ];

    it('should return the first permission that matches the provided action and subject', () => {
      const matchingPermission = findMatchingPermission(
        permissions,
        'plugins::users-permissions.roles.update',
        'test'
      );

      expect(matchingPermission).toMatchInlineSnapshot(`
        {
          "action": "plugins::users-permissions.roles.update",
          "actionParameters": [],
          "conditions": [],
          "createdAt": "",
          "id": 5,
          "properties": {},
          "subject": "test",
          "updatedAt": "",
        }
      `);
    });

    it('should return undefined if no permission matches the provided action and subject', () => {
      const matchingPermission = findMatchingPermission(
        permissions,
        'plugins::users-permissions.users.update',
        'test'
      );

      expect(matchingPermission).toMatchInlineSnapshot(`undefined`);
    });
  });

  describe('formatPermissionsForAPI', () => {
    it('should return an empty array when no permissions are enabled', () => {
      const settings = {
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

      expect(
        formatPermissionsForAPI({
          settings,
          plugins: {},
          collectionTypes: {},
          singleTypes: {},
        })
      ).toMatchInlineSnapshot(`[]`);
    });

    it('should return a formatted array of permissions when some permissions are enabled', () => {
      const settings = {
        'plugin::content-type-builder': {
          general: {
            'plugin::content-type-builder.read': {
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
                enabled: true,
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

      expect(
        formatPermissionsForAPI({
          settings,
          plugins: {},
          collectionTypes: {},
          singleTypes: {},
        })
      ).toMatchInlineSnapshot(`
        [
          {
            "action": "plugin::content-type-builder.read",
            "conditions": [],
            "properties": {},
            "subject": null,
          },
          {
            "action": "plugin::documentation.settings.update",
            "conditions": [],
            "properties": {},
            "subject": null,
          },
        ]
      `);
    });
  });
});
