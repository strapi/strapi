import {
  hasPermissions,
  findMatchingPermissions,
  formatPermissionsForRequest,
  shouldCheckPermissions,
} from '../hasPermissions';

import type { Permission } from '../../features/RBAC';

const hasPermissionsTestData: Record<string, Record<string, Permission[]>> = {
  userPermissions: {
    user1: [
      // Admin marketplace
      {
        action: 'admin::marketplace.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 1,
      },

      // Admin webhooks
      {
        action: 'admin::webhooks.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 2,
      },
      {
        action: 'admin::webhooks.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 3,
      },
      {
        action: 'admin::webhooks.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 4,
      },
      {
        action: 'admin::webhooks.delete',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 5,
      },

      // Admin users
      {
        action: 'admin::users.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 6,
      },
      {
        action: 'admin::users.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 7,
      },
      {
        action: 'admin::users.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 8,
      },
      {
        action: 'admin::users.delete',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 9,
      },

      // Admin roles
      {
        action: 'admin::roles.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 10,
      },
      {
        action: 'admin::roles.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 11,
      },
      {
        action: 'admin::roles.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 12,
      },
      {
        action: 'admin::roles.delete',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 13,
      },

      // Content type builder
      {
        action: 'plugin::content-type-builder.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 14,
      },

      // Documentation plugin
      {
        action: 'plugin::documentation.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 15,
      },
      {
        action: 'plugin::documentation.settings.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 16,
      },
      {
        action: 'plugin::documentation.settings.regenerate',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 17,
      },

      // Upload plugin
      {
        action: 'plugin::upload.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 18,
      },
      {
        action: 'plugin::upload.assets.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 19,
      },
      {
        action: 'plugin::upload.assets.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 20,
      },
      {
        action: 'plugin::upload.assets.dowload',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 21,
      },
      {
        action: 'plugin::upload.assets.copy-link',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 22,
      },

      // Users-permissions
      {
        action: 'plugin::users-permissions.roles.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 23,
      },
      {
        action: 'plugin::users-permissions.roles.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 24,
      },
      {
        action: 'plugin::users-permissions.roles.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 25,
      },
      {
        action: 'plugin::users-permissions.roles.delete',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 26,
      },
      {
        action: 'plugin::users-permissions.email-templates.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 27,
      },
      {
        action: 'plugin::users-permissions.email-templates.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 28,
      },
      {
        action: 'plugin::users-permissions.providers.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 29,
      },
      {
        action: 'plugin::users-permissions.providers.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 30,
      },
      {
        action: 'plugin::users-permissions.advanced-settings.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 31,
      },
      {
        action: 'plugin::users-permissions.advanced-settings.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 32,
      },
    ],
    user2: [
      // Admin webhooks
      {
        action: 'admin::webhooks.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 33,
      },
      {
        action: 'admin::webhooks.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 34,
      },
      {
        action: 'admin::webhooks.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 35,
      },
      {
        action: 'admin::webhooks.delete',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 36,
      },

      // Admin users
      {
        action: 'admin::users.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 37,
      },
      {
        action: 'admin::users.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 38,
      },
      {
        action: 'admin::users.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 39,
      },
      {
        action: 'admin::users.delete',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 40,
      },

      // Admin roles
      {
        action: 'admin::roles.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 41,
      },
      {
        action: 'admin::roles.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 42,
      },
      {
        action: 'admin::roles.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 43,
      },
      {
        action: 'admin::roles.delete',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 44,
      },

      // Content type builder
      {
        action: 'plugin::content-type-builder.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 45,
      },

      // Upload plugin
      {
        action: 'plugin::upload.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 46,
      },
      {
        action: 'plugin::upload.assets.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 47,
      },
      {
        action: 'plugin::upload.assets.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 48,
      },
      {
        action: 'plugin::upload.assets.dowload',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 49,
      },
      {
        action: 'plugin::upload.assets.copy-link',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 50,
      },

      // Users-permissions
      {
        action: 'plugin::users-permissions.roles.create',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 51,
      },
      {
        action: 'plugin::users-permissions.roles.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 51,
      },
      {
        action: 'plugin::users-permissions.roles.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 52,
      },
      {
        action: 'plugin::users-permissions.roles.delete',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 53,
      },
      {
        action: 'plugin::users-permissions.email-templates.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 54,
      },
      {
        action: 'plugin::users-permissions.email-templates.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 55,
      },
      {
        action: 'plugin::users-permissions.providers.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 56,
      },
      {
        action: 'plugin::users-permissions.providers.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 57,
      },
      {
        action: 'plugin::users-permissions.advanced-settings.read',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 58,
      },
      {
        action: 'plugin::users-permissions.advanced-settings.update',
        subject: null,
        properties: {},
        conditions: [],
        actionParameters: {},
        id: 59,
      },
    ],
  },
  permissionsToCheck: {
    listPlugins: [
      {
        action: 'admin::marketplace.read',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 1,
      },
    ],
    marketplace: [
      {
        action: 'admin::marketplace.read',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 2,
      },
    ],
    settings: [
      // webhooks
      {
        action: 'admin::webhook.create',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 3,
      },
      {
        action: 'admin::webhook.read',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 4,
      },
      {
        action: 'admin::webhook.update',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 5,
      },
      {
        action: 'admin::webhook.delete',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 6,
      },
      // users
      {
        action: 'admin::users.create',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 7,
      },
      {
        action: 'admin::users.read',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 8,
      },
      {
        action: 'admin::users.update',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 9,
      },
      {
        action: 'admin::users.delete',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 10,
      },
      // roles
      {
        action: 'admin::roles.create',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 11,
      },
      {
        action: 'admin::roles.update',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 12,
      },
      {
        action: 'admin::roles.read',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 13,
      },
      {
        action: 'admin::roles.delete',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 14,
      },
      // media library
      {
        action: 'plugin::upload.read',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 15,
      },
      {
        action: 'plugin::upload.assets.create',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 16,
      },
      {
        action: 'plugin::upload.assets.update',
        subject: null,
        properties: {},
        actionParameters: {},
        conditions: [],
        id: 17,
      },
    ],
  },
};

describe('hasPermissions', () => {
  describe('findMatchingPermissions', () => {
    it('should return an empty array if both arguments are empty', () => {
      expect(findMatchingPermissions([], [])).toHaveLength(0);
      expect(findMatchingPermissions([], [])).toEqual([]);
    });

    it('should return an empty array if there is no permissions that matches', () => {
      const data = hasPermissionsTestData.userPermissions.user1;

      expect(findMatchingPermissions(data, [])).toHaveLength(0);
      expect(findMatchingPermissions(data, [])).toEqual([]);
    });

    it('should return an array with the matched permissions', () => {
      const data = hasPermissionsTestData.userPermissions.user1;
      const dataToCheck = hasPermissionsTestData.permissionsToCheck.listPlugins;

      expect(findMatchingPermissions(data, dataToCheck)).toHaveLength(1);
      expect(findMatchingPermissions(data, dataToCheck)).toEqual([
        {
          action: 'admin::marketplace.read',
          subject: null,
          properties: {},
          conditions: [],
          id: 1,
          actionParameters: {},
        },
      ]);
    });
  });

  describe('formatPermissionsForRequest', () => {
    it('should create an array of object containing only the action, subject & fields keys', () => {
      const data: Permission[] = [
        {
          action: 'admin::marketplace.read',
          subject: null,
          properties: {
            fields: ['test'],
          },
          conditions: [],
          actionParameters: {},
          id: 1,
        },
        {
          action: 'admin::webhooks.delete',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
          actionParameters: {},
          id: 2,
        },
        {
          action: 'a',
          subject: 'b',
          properties: {},
          conditions: ['customCondition'],
          actionParameters: {},
          id: 3,
        },
      ];

      expect(formatPermissionsForRequest(data)).toMatchInlineSnapshot(`
        [
          {
            "action": "admin::marketplace.read",
          },
          {
            "action": "admin::webhooks.delete",
          },
          {
            "action": "a",
            "subject": "b",
          },
        ]
      `);
    });
  });

  describe('hasPermissions', () => {
    it('should return true if there is no permissions', async () => {
      const data = hasPermissionsTestData.userPermissions.user1;
      const result = await hasPermissions(data, []);

      expect(result).toBeTruthy();
    });

    it('should return true if there is at least one permissions that matches the user one', async () => {
      const data = hasPermissionsTestData.userPermissions.user1;
      const dataToCheck = hasPermissionsTestData.permissionsToCheck.marketplace;
      const result = await hasPermissions(data, dataToCheck);

      expect(result).toBeTruthy();
    });

    it('should return false no permission is matching', async () => {
      const data = hasPermissionsTestData.userPermissions.user1;
      const dataToCheck: Permission[] = [
        {
          id: 1,
          action: 'something',
          subject: 'something',
          properties: {},
          actionParameters: {},
          conditions: [],
        },
      ];

      const result = await hasPermissions(data, dataToCheck);

      expect(result).toBeFalsy();
    });
  });

  describe('shouldCheckPermissions', () => {
    it('should return false if there is no data', () => {
      expect(shouldCheckPermissions([])).toBeFalsy();
    });

    it('should return false if there is no condition in the array of permissions', () => {
      const data: Permission[] = [
        {
          id: 1,
          action: 'admin::marketplace.read',
          subject: null,
          properties: {},
          conditions: [],
          actionParameters: {},
        },
      ];

      expect(shouldCheckPermissions(data)).toBeFalsy();
    });

    it('should return false if there is at least one item that does not have a condition in the array of permissions', () => {
      const data: Permission[] = [
        {
          id: 1,
          action: 'admin::marketplace.read',
          subject: null,
          properties: {},
          conditions: [],
          actionParameters: {},
        },
        {
          id: 2,
          action: 'admin::webhooks.delete',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
          actionParameters: {},
        },
        {
          id: 3,
          action: 'admin::webhooks.create',
          subject: null,
          properties: {},
          actionParameters: {},
          conditions: [],
        },
      ];

      expect(shouldCheckPermissions(data)).toBeFalsy();
    });

    it('should return true otherwise', () => {
      const data: Permission[] = [
        {
          id: 1,
          action: 'admin::marketplace.read',
          subject: null,
          properties: {},
          conditions: ['test'],
          actionParameters: {},
        },
        {
          id: 2,
          action: 'admin::webhooks.delete',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
          actionParameters: {},
        },
        {
          id: 3,
          action: 'admin::webhooks.create',
          subject: null,
          properties: {},
          conditions: ['test'],
          actionParameters: {},
        },
      ];

      expect(shouldCheckPermissions(data)).toBeTruthy();
    });
  });
});
