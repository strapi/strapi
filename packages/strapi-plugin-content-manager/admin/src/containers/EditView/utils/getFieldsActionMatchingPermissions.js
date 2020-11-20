import { uniq, flatMap } from 'lodash';
import { findMatchingPermissions } from 'strapi-helper-plugin';

const getFieldsActionMatchingPermissions = (userPermissions, slug) => {
  const getMatchingPermissions = action => {
    const matched = findMatchingPermissions(userPermissions, [
      {
        action: `plugins::content-manager.explorer.${action}`,
        subject: slug,
      },
    ]);

    return uniq(flatMap(matched, 'fields'));
  };

  return {
    createActionAllowedFields: getMatchingPermissions('create'),
    readActionAllowedFields: getMatchingPermissions('read'),
    updateActionAllowedFields: getMatchingPermissions('update'),
  };
};

export default getFieldsActionMatchingPermissions;
