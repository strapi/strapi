const generateHeadersFromActions = (actions, propertyName) => {
  return actions.map((action) => {
    const isActionRelatedToCurrentProperty =
      Array.isArray(action.applyToProperties) &&
      action.applyToProperties.indexOf(propertyName) !== -1 &&
      action.isDisplayed;

    return { label: action.label, actionId: action.actionId, isActionRelatedToCurrentProperty };
  });
};

export default generateHeadersFromActions;
