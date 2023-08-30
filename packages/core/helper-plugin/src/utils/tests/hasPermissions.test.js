import {
  hasPermissions,
  findMatchingPermissions,
  formatPermissionsForRequest,
  shouldCheckPermissions,
} from '../hasPermissions';

const hasPermissionsTestData = {
  userPermissions: {
    user1: [
      // Admin marketplace
      {
        action: 'admin::marketplace.read',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin webhooks
      {
        action: 'admin::webhooks.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin users
      {
        action: 'admin::users.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin roles
      {
        action: 'admin::roles.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Content type builder
      {
        action: 'plugin::content-type-builder.read',
        subject: null,
        properties: {},
        conditions: null,
      },

      // Documentation plugin
      {
        action: 'plugin::documentation.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::documentation.settings.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::documentation.settings.regenerate',
        subject: null,
        properties: {},
        conditions: null,
      },

      // Upload plugin
      {
        action: 'plugin::upload.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::upload.assets.create',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::upload.assets.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::upload.assets.dowload',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::upload.assets.copy-link',
        subject: null,
        properties: {},
        conditions: null,
      },

      // Users-permissions
      {
        action: 'plugin::users-permissions.roles.create',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.roles.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.roles.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.roles.delete',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.email-templates.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.email-templates.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.providers.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.providers.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.advanced-settings.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.advanced-settings.update',
        subject: null,
        properties: {},
        conditions: null,
      },
    ],
    user2: [
      // Admin webhooks
      {
        action: 'admin::webhooks.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin users
      {
        action: 'admin::users.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin roles
      {
        action: 'admin::roles.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Content type builder
      {
        action: 'plugin::content-type-builder.read',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Upload plugin
      {
        action: 'plugin::upload.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::upload.assets.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::upload.assets.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::upload.assets.dowload',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::upload.assets.copy-link',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Users-permissions
      {
        action: 'plugin::users-permissions.roles.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.roles.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.roles.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.roles.delete',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.email-templates.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.email-templates.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.providers.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.providers.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.advanced-settings.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.advanced-settings.update',
        subject: null,
        properties: {},
        conditions: [],
      },
    ],
  },
  permissionsToCheck: {
    listPlugins: [{ action: 'admin::marketplace.read', subject: null }],
    marketplace: [{ action: 'admin::marketplace.read', subject: null }],
    settings: [
      // webhooks
      { action: 'admin::webhook.create', subject: null },
      { action: 'admin::webhook.read', subject: null },
      { action: 'admin::webhook.update', subject: null },
      { action: 'admin::webhook.delete', subject: null },
      // users
      { action: 'admin::users.create', subject: null },
      { action: 'admin::users.read', subject: null },
      { action: 'admin::users.update', subject: null },
      { action: 'admin::users.delete', subject: null },
      // roles
      { action: 'admin::roles.create', subject: null },
      { action: 'admin::roles.update', subject: null },
      { action: 'admin::roles.read', subject: null },
      { action: 'admin::roles.delete', subject: null },
      // media library
      { action: 'plugin::upload.read', subject: null },
      { action: 'plugin::upload.assets.create', subject: null },
      { action: 'plugin::upload.assets.update', subject: null },
    ],
  },
};

describe('STRAPI-HELPER_PLUGIN | utils ', () => {
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
        },
      ]);
    });
  });

  describe('formatPermissionsForRequest', () => {
    it('should create an array of object containing only the action, subject & fields keys', () => {
      const data = [
        {
          action: 'admin::marketplace.read',
          subject: null,
          properties: {
            fields: ['test'],
          },
          conditions: [],
        },
        {
          action: 'admin::webhooks.delete',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
        },
      ];
      const expected = [
        {
          action: 'admin::marketplace.read',
        },
        {
          action: 'admin::webhooks.delete',
        },
      ];

      expect(formatPermissionsForRequest(data)).toEqual(expected);
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
      const dataToCheck = [
        {
          action: 'something',
          subject: 'something',
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
      const data = [
        {
          action: 'admin::marketplace.read',
          subject: null,
          properties: {},
          conditions: [],
        },
      ];

      expect(shouldCheckPermissions(data)).toBeFalsy();
    });

    it('should return false if there is at least one item that does not have a condition in the array of permissions', () => {
      const data = [
        {
          action: 'admin::marketplace.read',
          subject: null,
          properties: {},
          conditions: [],
        },
        {
          action: 'admin::webhooks.delete',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
        },
        {
          action: 'admin::webhooks.create',
          subject: null,
          properties: {},
          conditions: null,
        },
      ];

      expect(shouldCheckPermissions(data)).toBeFalsy();
    });

    it('should return true otherwise', () => {
      const data = [
        {
          action: 'admin::marketplace.read',
          subject: null,
          properties: {},
          conditions: ['test'],
        },
        {
          action: 'admin::webhooks.delete',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
        },
        {
          action: 'admin::webhooks.create',
          subject: null,
          properties: {},
          conditions: ['test'],
        },
      ];

      expect(shouldCheckPermissions(data)).toBeTruthy();
    });
  });
});
