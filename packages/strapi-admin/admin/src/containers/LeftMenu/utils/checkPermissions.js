import { hasPermissions } from 'strapi-helper-plugin';

/**
 * This function resolves an array of Promises<boolean>
 * It puts at a specific index the status of a specific permission.
 * While this might look weird, we then iterate on this array
 * and check the different CT/ST/general/plugin sections
 * and make an index based comparisons
 */
const checkPermissions = (userPermissions, permissionsToCheck) =>
  permissionsToCheck.map(({ permissions }) => hasPermissions(userPermissions, permissions));

export default checkPermissions;
