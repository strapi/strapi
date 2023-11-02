const findDisplayedActions = (actions) =>
  actions.filter(({ subjects }) => subjects && subjects.length);

export default findDisplayedActions;
