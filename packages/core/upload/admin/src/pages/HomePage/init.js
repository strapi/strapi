const init = (initialState, allowedActions) => {
  return { ...initialState, isLoading: allowedActions.canRead };
};

export default init;
