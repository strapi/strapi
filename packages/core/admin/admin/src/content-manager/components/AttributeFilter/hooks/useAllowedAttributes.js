import { useRBACProvider, findMatchingPermissions, useCollator } from '@strapi/helper-plugin';
import get from 'lodash/get';
import { useIntl } from 'react-intl';

const NOT_ALLOWED_FILTERS = ['json', 'component', 'media', 'richtext', 'dynamiczone', 'password'];
const TIMESTAMPS = ['createdAt', 'updatedAt'];
const CREATOR_ATTRIBUTES = ['createdBy', 'updatedBy'];

const useAllowedAttributes = (contentType, slug) => {
  const { allPermissions } = useRBACProvider();
  const { locale } = useIntl();

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

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

  const readPermissionForAttr = get(readPermissionsForSlug, ['0', 'properties', 'fields'], []);
  const attributesArray = Object.keys(get(contentType, ['attributes']), {});
  const allowedAttributes = attributesArray.filter((attr) => {
    const current = get(contentType, ['attributes', attr], {});

    if (!current.type) {
      return false;
    }

    if (NOT_ALLOWED_FILTERS.includes(current.type)) {
      return false;
    }

    if (!readPermissionForAttr.includes(attr) && attr !== 'id' && !TIMESTAMPS.includes(attr)) {
      return false;
    }

    return true;
  });

  return [...allowedAttributes, ...(canReadAdminUsers ? CREATOR_ATTRIBUTES : [])].sort((a, b) =>
    formatter.compare(a, b)
  );
};

export default useAllowedAttributes;
