import { findMatchingPermissions } from '@strapi/helper-plugin';
import flatMap from 'lodash/flatMap';
import uniq from 'lodash/uniq';

const getFieldsActionMatchingPermissions = (userPermissions, slug) => {
  const getMatchingPermissions = (action) => {
    const matched = findMatchingPermissions(userPermissions, [
      {
        action: `plugin::content-manager.explorer.${action}`,
        subject: slug,
      },
    ]);

    return uniq(flatMap(matched, 'properties.fields'));
  };

  return {
    createActionAllowedFields: getMatchingPermissions('create'),
    readActionAllowedFields: getMatchingPermissions('read'),
    updateActionAllowedFields: getMatchingPermissions('update'),
  };
};

export default getFieldsActionMatchingPermissions;
