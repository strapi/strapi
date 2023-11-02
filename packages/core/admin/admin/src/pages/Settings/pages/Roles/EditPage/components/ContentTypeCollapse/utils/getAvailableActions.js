const getAvailableActions = (actions, targetSubject) => {
  return actions.map((action) => {
    const isDisplayed =
      Array.isArray(action.subjects) && action.subjects.indexOf(targetSubject) !== -1;

    return { ...action, isDisplayed };
  });
};

export default getAvailableActions;
