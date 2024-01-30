import { Permission, findMatchingPermissions } from '@strapi/helper-plugin';

const getFieldsActionMatchingPermissions = (userPermissions: Permission[], slug: string) => {
  const getMatchingPermissions = (action: 'create' | 'read' | 'update') => {
    const matched = findMatchingPermissions(userPermissions, [
      {
        action: `plugin::content-manager.explorer.${action}`,
        subject: slug,
      },
    ]);

    return (
      matched
        .flatMap((perm) => perm.properties?.fields)
        // return only unique fields
        .filter(
          (field, index, arr): field is string =>
            arr.indexOf(field) === index && typeof field === 'string'
        )
    );
  };

  return {
    createActionAllowedFields: getMatchingPermissions('create'),
    readActionAllowedFields: getMatchingPermissions('read'),
    updateActionAllowedFields: getMatchingPermissions('update'),
  };
};

export { getFieldsActionMatchingPermissions };
