import { isEmpty, pick, transform } from 'lodash';
import request from './request';

const findMatchingPermissions = (userPermissions, permissions) => {
  return transform(
    userPermissions,
    (result, value) => {
      const associatedPermission = permissions.find(
        perm => perm.action === value.action && perm.subject === value.subject
      );

      if (associatedPermission) {
        result.push(value);
      }
    },
    []
  );
};

const formatPermissionsForRequest = permissions =>
  permissions.map(permission => pick(permission, ['action', 'subject', 'fields']));

const shouldCheckPermissions = permissions =>
  !isEmpty(permissions) && permissions.every(perm => !isEmpty(perm.conditions));

const hasPermissions = async (userPermissions, permissions) => {
  if (!permissions || !permissions.length) {
    return true;
  }

  const matchingPermissions = findMatchingPermissions(userPermissions, permissions);

  if (shouldCheckPermissions(matchingPermissions)) {
    let hasPermission = false;

    try {
      hasPermission = await request('/admin/permissions/check', {
        method: 'POST',
        body: {
          permissions: formatPermissionsForRequest(matchingPermissions),
        },
      });
    } catch (err) {
      console.error('Error while checking permissions', err);
    }

    return hasPermission;
  }

  return matchingPermissions.length > 0;
};

export default hasPermissions;
export { findMatchingPermissions, formatPermissionsForRequest, shouldCheckPermissions };
