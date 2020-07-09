import { staticAttributeActions } from './permissonsConstantsActions';

const generateContentTypeActions = (
  subjectPermissions,
  existingContentTypeActions,
  shouldAddDeleteAction = false
) => {
  const additionalActions = Object.entries(existingContentTypeActions).reduce((acc, current) => {
    if (current[1] && !staticAttributeActions.includes(current[0])) {
      return { ...acc, [current[0]]: current[1] };
    }

    return acc;
  }, {});

  const actions = Array.from(
    new Set(
      Object.values(subjectPermissions).reduce((acc, current) => {
        return [...acc, ...current.actions];
      }, [])
    )
  );

  const generatedContentTypeActions = actions.reduce(
    (acc, current) => ({
      ...acc,
      [current]: true,
    }),
    {}
  );

  if (shouldAddDeleteAction) {
    return {
      ...generatedContentTypeActions,
      ...additionalActions,
      // TODO : Add all permissionLayout actions
      'plugins::content-manager.explorer.delete': true,
    };
  }

  return {
    ...generatedContentTypeActions,
    ...additionalActions,
  };
};

export default generateContentTypeActions;
