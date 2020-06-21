const existingActions = permissions => {
  return Array.from(
    new Set(
      Object.entries(permissions).reduce((acc, current) => {
        const actionsPermission = permission =>
          permission.reduce((accAction, currentAction) => {
            let actionsToReturn = accAction;

            if (currentAction.actions) {
              actionsToReturn = [...actionsToReturn, ...currentAction.actions];
            }

            if (typeof currentAction === 'object' && !currentAction.actions) {
              actionsToReturn = [...actionsToReturn, ...Object.keys(currentAction)];
            }

            return actionsToReturn;
          }, []);

        return [...acc, ...actionsPermission(Object.values(current[1]))];
      }, [])
    )
  );
};

const formatPermissionsToApi = permissions => {
  return Object.entries(permissions).reduce((acc, current) => {
    const formatPermission = permission =>
      existingActions(permissions).reduce((actionAcc, currentAction) => {
        const hasAction =
          Object.values(permission[1]).findIndex(
            item => item.actions && item.actions.includes(currentAction)
          ) !== -1;
        const hasContentTypeAction =
          permission[1].contentTypeActions && permission[1].contentTypeActions[currentAction];
        const fields = Object.entries(permission[1])
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

        return actionAcc;
      }, []);

    return [...acc, ...formatPermission(current)];
  }, []);
};

export default formatPermissionsToApi;
