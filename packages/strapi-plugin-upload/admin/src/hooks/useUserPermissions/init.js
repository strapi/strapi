const init = (initialState, permissionsNames) => {
  const allowedActions = permissionsNames.reduce((acc, current) => {
    acc[current] = false;

    return acc;
  }, {});

  return { ...initialState, allowedActions };
};

export default init;
