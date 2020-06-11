import { isEmpty, transform } from 'lodash';

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

const shouldCheckPermissions = permissions =>
  !isEmpty(permissions) && permissions.every(perm => !isEmpty(perm.conditions));

const hasPermissions = async (userPermissions, permissions) => {
  if (!permissions.length) {
    return true;
  }

  const matchingPermissions = findMatchingPermissions(userPermissions, permissions);

  // TODO test when API ready
  if (shouldCheckPermissions(matchingPermissions)) {
    // TODO
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
export { findMatchingPermissions, shouldCheckPermissions };
