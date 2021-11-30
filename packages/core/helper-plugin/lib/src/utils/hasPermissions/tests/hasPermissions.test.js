import hasPermissions, {
  findMatchingPermissions,
  formatPermissionsForRequest,
  shouldCheckPermissions,
} from '../index';
import hasPermissionsTestData from './hasPermissionsTestData';

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

      expect(findMatchingPermissions(data, dataToCheck)).toHaveLength(2);
      expect(findMatchingPermissions(data, dataToCheck)).toEqual([
        {
          action: 'admin::marketplace.read',
          subject: null,
          properties: {},
          conditions: [],
        },
        {
          action: 'admin::marketplace.plugins.uninstall',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
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
          action: 'admin::marketplace.plugins.uninstall',
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
          action: 'admin::marketplace.plugins.uninstall',
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
          action: 'admin::marketplace.plugins.uninstall',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
        },
        {
          action: 'admin::marketplace.plugins.install',
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
          action: 'admin::marketplace.plugins.uninstall',
          subject: null,
          properties: {},
          conditions: ['customCondition'],
        },
        {
          action: 'admin::marketplace.plugins.install',
          subject: null,
          properties: {},
          conditions: ['test'],
        },
      ];

      expect(shouldCheckPermissions(data)).toBeTruthy();
    });
  });
});
