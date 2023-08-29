const getExistingActions = (permissions) => {
  return Array.from(
    new Set(
      Object.entries(permissions).reduce((acc, current) => {
        const getActionsPermission = (permission) =>
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

        return [
          ...acc,
          ...getActionsPermission([
            ...Object.values(current[1].attributes || {}),
            current[1]?.contentTypeActions ?? {},
          ]),
        ];
      }, [])
    )
  );
};

export default getExistingActions;
