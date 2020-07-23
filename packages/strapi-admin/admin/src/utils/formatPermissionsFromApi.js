import { get, pick } from 'lodash';
import { contentManagerPermissionPrefix } from '../components/Roles/Permissions/utils/permissonsConstantsActions';

const formatPermissionsFromApi = data => {
  const getFieldsPermissions = (permissionsAcc, permission) => {
    const fields = get(permission, ['fields'], []);

    if (fields) {
      return fields.reduce((acc, field) => {
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
    }

    return {};
  };

  const formattedPermissions = data.reduce((acc, current) => {
    if (current.action.startsWith(contentManagerPermissionPrefix)) {
      const subjectAcc = get(acc, ['contentTypesPermissions', current.subject], {});

      return {
        ...acc,
        contentTypesPermissions: {
          ...acc.contentTypesPermissions,
          [current.subject]: {
            ...subjectAcc,
            attributes: {
              ...subjectAcc.attributes,
              ...getFieldsPermissions(acc.contentTypesPermissions, current),
            },
            contentTypeActions: {
              ...subjectAcc.contentTypeActions,
              [current.action]: true,
            },
            conditions: {
              ...subjectAcc.conditions,
              [current.action]: [
                ...get(subjectAcc, ['conditions', current.action], []),
                ...current.conditions,
              ],
            },
          },
        },
      };
    }

    return {
      ...acc,
      // As we do not need any manupulation for others permissions, we just add them in the
      // pluginsAndSettingsPermissions section.
      // This can be changed in the futur so we don't need to create a complexe data structure for those permissions
      pluginsAndSettingsPermissions: [
        ...(acc.pluginsAndSettingsPermissions || []),
        pick(current, ['fields', 'conditions', 'subject', 'action']),
      ],
    };
  }, {});

  return formattedPermissions;
};

export default formatPermissionsFromApi;
