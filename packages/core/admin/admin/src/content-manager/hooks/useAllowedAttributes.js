import { useRBACProvider, findMatchingPermissions } from '@strapi/helper-plugin';

import { CREATOR_FIELDS } from '../constants/attributes';

const NOT_ALLOWED_FILTERS = [
  'json',
  'component',
  'media',
  'richtext',
  'dynamiczone',
  'password',
  'blocks',
];
const TIMESTAMPS = ['createdAt', 'updatedAt'];

export const useAllowedAttributes = (contentType, slug) => {
  const { allPermissions } = useRBACProvider();

  const readPermissionsForSlug = findMatchingPermissions(allPermissions, [
    {
      action: 'plugin::content-manager.explorer.read',
      subject: slug,
    },
  ]);

  const canReadAdminUsers =
    findMatchingPermissions(allPermissions, [
      {
        action: 'admin::users.read',
        subject: null,
      },
    ]).length > 0;

  const attributesWithReadPermissions = readPermissionsForSlug?.[0]?.properties?.fields ?? [];

  const allowedAttributes = attributesWithReadPermissions.filter((attr) => {
    const current = contentType?.attributes?.[attr] ?? {};

    if (!current.type) {
      return false;
    }

    if (NOT_ALLOWED_FILTERS.includes(current.type)) {
      return false;
    }

    return true;
  });

  return ['id', ...allowedAttributes, ...TIMESTAMPS, ...(canReadAdminUsers ? CREATOR_FIELDS : [])];
};
