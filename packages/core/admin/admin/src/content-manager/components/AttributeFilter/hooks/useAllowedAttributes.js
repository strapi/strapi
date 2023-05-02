import { useRBACProvider, findMatchingPermissions } from '@strapi/helper-plugin';

const NOT_ALLOWED_FILTERS = ['json', 'component', 'media', 'richtext', 'dynamiczone', 'password'];
const TIMESTAMPS = ['createdAt', 'updatedAt'];

export function useAllowedAttributes(contentType, slug) {
  const { allPermissions } = useRBACProvider();

  const readPermissionsForSlug = findMatchingPermissions(allPermissions, [
    {
      action: 'plugin::content-manager.explorer.read',
      subject: slug,
    },
  ]);

  const readPermissionForAttr = readPermissionsForSlug?.[0]?.properties?.fields ?? [];

  return Object.entries(contentType.attributes)
    .filter(([name, attribute]) => {
      if (!attribute.type) {
        return false;
      }

      if (NOT_ALLOWED_FILTERS.includes(attribute.type)) {
        return false;
      }

      // this allows filtering by createdAt and updatedAt. Both are not part of RBAC.
      if (!readPermissionForAttr.includes(name) && name !== 'id' && !TIMESTAMPS.includes(name)) {
        return false;
      }

      return true;
    })
    .map(([name]) => name);
}
