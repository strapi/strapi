import { getFetchClient } from './getFetchClient';

import type { Permission } from '@strapi/permissions';
import type { GenericAbortSignal } from 'axios';

const findMatchingPermissions = (userPermissions: Permission[], permissions: Permission[]) =>
  userPermissions.reduce<Permission[]>((acc, curr) => {
    const associatedPermission = permissions.find(
      (perm) => perm.action === curr.action && perm.subject === curr.subject
    );

    if (associatedPermission) {
      acc.push(curr);
    }

    return acc;
  }, []);

const formatPermissionsForRequest = (permissions: Permission[]) =>
  permissions.map((permission) => {
    if (!permission.action) {
      return {};
    }

    const returnedPermission: Permission = {
      action: permission.action,
    };

    if (permission.subject) {
      returnedPermission.subject = permission.subject;
    }

    return returnedPermission;
  });

/**
 * This should fail if there are no permissions or if there are permissions but no conditions
 */
const shouldCheckPermissions = (permissions: Permission[]) =>
  permissions.length > 0 &&
  permissions.every((perm) => Array.isArray(perm.conditions) && perm.conditions.length > 0);

const hasPermissions = async (
  userPermissions: Permission[],
  permissions: Permission[],
  signal?: GenericAbortSignal
) => {
  if (!permissions || !permissions.length) {
    return true;
  }

  const matchingPermissions = findMatchingPermissions(userPermissions, permissions);

  if (shouldCheckPermissions(matchingPermissions)) {
    let hasPermission = false;

    try {
      const {
        data: { data },
      } = await getFetchClient().post<{ data: boolean[] }>(
        '/admin/permissions/check',
        {
          permissions: formatPermissionsForRequest(matchingPermissions),
        },
        { signal }
      );

      hasPermission = data.every((v) => v === true);
    } catch (err) {
      console.error('Error while checking permissions', err);
    }

    return hasPermission;
  }

  return matchingPermissions.length > 0;
};

export {
  hasPermissions,
  findMatchingPermissions,
  formatPermissionsForRequest,
  shouldCheckPermissions,
};
