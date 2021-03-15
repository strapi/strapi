import { hasPermissions } from 'strapi-helper-plugin';

const checkPermissions = (userPermissions, permissionsToCheck) =>
  permissionsToCheck.map(({ permissions }) => hasPermissions(userPermissions, permissions));

export default checkPermissions;
