const init = (state, permissionsLayout, permissions) => {
  return {
    ...state,
    permissionsLayout,
    permissions,
  };
};

export default init;
