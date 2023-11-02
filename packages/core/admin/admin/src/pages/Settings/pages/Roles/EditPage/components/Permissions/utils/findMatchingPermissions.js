const findMatchingPermission = (permissions, action, subject) =>
  permissions.find((perm) => perm.action === action && perm.subject === subject);

export default findMatchingPermission;
