import { get } from 'lodash';
import getExistingActions from './getExistingActions';

const formatPermissionsToApi = permissions => {
  const existingActions = getExistingActions(permissions.contentTypesPermissions);

  const formattedPermissions = Object.entries(permissions.contentTypesPermissions).reduce(
    (acc, current) => {
      const formatPermission = permission =>
        existingActions.reduce((actionAcc, currentAction) => {
          const { contentTypeActions, attributes, conditions } = permission[1];

          if (contentTypeActions && contentTypeActions[currentAction]) {
            const hasAction =
              Object.values(attributes).findIndex(
                item => item.actions && item.actions.includes(currentAction)
              ) !== -1;
            const hasContentTypeAction = contentTypeActions && contentTypeActions[currentAction];
            const fields = Object.entries(permission[1].attributes)
              .map(item => {
                if (item[1].actions && item[1].actions.includes(currentAction)) {
                  return item[0];
                }

                return null;
              })
              .filter(item => !!item);

            if (hasAction || hasContentTypeAction) {
              return [
                ...actionAcc,
                {
                  action: currentAction,
                  subject: permission[0],
                  fields: fields.length > 0 ? fields : null,
                  conditions: get(conditions, [currentAction], []),
                },
              ];
            }
          }

          return actionAcc;
        }, []);

      return [...acc, ...formatPermission(current)];
    },
    []
  );

  return [...formattedPermissions, ...(permissions.pluginsAndSettingsPermissions || [])];
};

export default formatPermissionsToApi;
