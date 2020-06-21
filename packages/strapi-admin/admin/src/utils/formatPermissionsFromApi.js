import { get } from 'lodash';
import { staticAttributeActions } from '../components/Roles/permissions/utils';

const formatPermissionsFromApi = data => {
  const getFieldsPermissions = (permissionsAcc, permission) => {
    return get(permission, ['fields'], []).reduce((acc, field) => {
      return {
        ...acc,
        [field]: {
          ...get(permissionsAcc, [permission.subject, field], {}),
          actions: [
            ...get(permissionsAcc, [permission.subject, field, 'actions'], []),
            permission.action,
          ],
        },
      };
    }, {});
  };

  const formattedPermissions = data.reduce((acc, current) => {
    const isContentTypeAction = !staticAttributeActions.includes(current.action);

    if (isContentTypeAction) {
      return {
        ...acc,
        [current.subject]: {
          ...acc[current.subject],
          contentTypeActions: {
            [current.action]: true,
          },
        },
      };
    }

    return {
      ...acc,
      [current.subject]: {
        ...acc[current.subject],
        ...getFieldsPermissions(acc, current),
      },
    };
  }, {});

  return formattedPermissions;
};

export default formatPermissionsFromApi;
