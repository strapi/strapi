const init = (initialState, allowedActions) => {
  return initialState.set('isLoading', allowedActions.canRead);
};

export default init;
