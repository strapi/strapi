import getExistingActions from './getExistingActions';

const formatPermissionsToApi = permissions => {
  const existingActions = getExistingActions(permissions);

  return Object.entries(permissions).reduce((acc, current) => {
    const formatPermission = permission =>
      existingActions.reduce((actionAcc, currentAction) => {
        if (permission[1].contentTypeActions && permission[1].contentTypeActions[currentAction]) {
          const hasAction =
            Object.values(permission[1].attributes).findIndex(
              item => item.actions && item.actions.includes(currentAction)
            ) !== -1;
          const hasContentTypeAction =
            permission[1].contentTypeActions && permission[1].contentTypeActions[currentAction];
          const fields = Object.entries(permission[1].attributes)
            .map(item => {
              if (item[1].actions && item[1].actions.includes(currentAction)) {
                return item[0];
              }

              return null;
            })
            .filter(item => item && item !== 'contentTypeActions');

          if (hasAction || hasContentTypeAction) {
            return [
              ...actionAcc,
              {
                action: currentAction,
                subject: permission[0],
                fields,
                conditions: [],
              },
            ];
          }
        }

        return actionAcc;
      }, []);

    return [...acc, ...formatPermission(current)];
  }, []);
};

export default formatPermissionsToApi;
