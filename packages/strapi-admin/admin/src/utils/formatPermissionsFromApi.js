import { get } from 'lodash';

const formatPermissionsFromApi = data => {
  const getFieldsPermissions = (permissionsAcc, permission) => {
    return get(permission, ['fields'], []).reduce((acc, field) => {
      return {
        ...acc,
        [field]: {
          ...get(permissionsAcc, [permission.subject, 'attributes', field], {}),
          actions: [
            ...get(permissionsAcc, [permission.subject, 'attributes', field, 'actions'], []),
            permission.action,
          ],
        },
      };
    }, {});
  };

  const formattedPermissions = data.reduce((acc, current) => {
    return {
      ...acc,
      [current.subject]: {
        ...acc[current.subject],
        attributes: {
          ...get(acc, [current.subject, 'attributes'], {}),
          ...getFieldsPermissions(acc, current),
        },
        contentTypeActions: {
          ...get(acc, [current.subject, 'contentTypeActions'], {}),
          [current.action]: true,
        },
      },
    };
  }, {});

  return formattedPermissions;
};

export default formatPermissionsFromApi;
