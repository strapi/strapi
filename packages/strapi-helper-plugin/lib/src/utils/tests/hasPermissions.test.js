import hasPermissions, { findMatchingPermissions, shouldCheckPermissions } from '../hasPermissions';
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
          fields: null,
          conditions: [],
        },
        {
          action: 'admin::marketplace.plugins.uninstall',
          subject: null,
          fields: null,
          conditions: ['customCondition'],
        },
      ]);
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

    it('should return true if there is no condition in the array of permissions', () => {
      const data = [
        {
          action: 'admin::marketplace.read',
          subject: null,
          fields: null,
          conditions: [],
        },
      ];

      expect(shouldCheckPermissions(data)).toBeTruthy();
    });

    it('should return true if there is at least one item that has a condition in the array of permissions', () => {
      const data = [
        {
          action: 'admin::marketplace.read',
          subject: null,
          fields: null,
          conditions: [],
        },
        {
          action: 'admin::marketplace.plugins.uninstall',
          subject: null,
          fields: null,
          conditions: ['customCondition'],
        },
        {
          action: 'admin::marketplace.plugins.install',
          subject: null,
          fields: null,
          conditions: null,
        },
      ];

      expect(shouldCheckPermissions(data)).toBeTruthy();
    });
  });
});
