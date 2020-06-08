import { transform } from 'lodash';

const hasPermissions = async (userPermissions, permissions) => {
  const matchingPermissions = transform(
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

  if (!permissions.length) {
    return true;
  }

  if (matchingPermissions.some(perm => perm.conditions && perm.conditions.length)) {
    console.log('should do something');
    const hasPermission = await new Promise(resolve =>
      setTimeout(() => {
        resolve(true);
      }, 2000)
    );

    return hasPermission;
  }

  return matchingPermissions.length > 0;
};

export default hasPermissions;
