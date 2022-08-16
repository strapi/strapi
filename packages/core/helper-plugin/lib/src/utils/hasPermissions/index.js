import { isEmpty, pickBy, transform } from 'lodash';
import request from '../request';

const findMatchingPermissions = (userPermissions, permissions) => {
  return transform(
    userPermissions,
    (result, value) => {
      const associatedPermission = permissions.find(
        (perm) => perm.action === value.action && perm.subject === value.subject
      );

      if (associatedPermission) {
        result.push(value);
      }
    },
    []
  );
};

const formatPermissionsForRequest = (permissions) =>
  permissions.map((permission) =>
    pickBy(permission, (value, key) => {
      return ['action', 'subject'].includes(key) && !isEmpty(value);
    })
  );

const shouldCheckPermissions = (permissions) =>
  !isEmpty(permissions) && permissions.every((perm) => !isEmpty(perm.conditions));

/**
 *
 * @param {Object[]} userPermissions array of the user's permissions
 * @param {Object[]} permissions array of permissions that we want to find from the user's permissions
 * @returns Boolean
 */
const hasPermissions = async (userPermissions, permissions, signal) => {
  if (!permissions || !permissions.length) {
    return true;
  }

  const matchingPermissions = findMatchingPermissions(userPermissions, permissions);

  if (shouldCheckPermissions(matchingPermissions)) {
    let hasPermission = false;

    try {
      const { data } = await request('/admin/permissions/check', {
        method: 'POST',
        body: {
          permissions: formatPermissionsForRequest(matchingPermissions),
        },
        signal,
      });

      hasPermission = data.every((v) => v === true);
    } catch (err) {
      console.error('Error while checking permissions', err);
    }

    return hasPermission;
  }

  return matchingPermissions.length > 0;
};

export default hasPermissions;
export { findMatchingPermissions, formatPermissionsForRequest, shouldCheckPermissions };
