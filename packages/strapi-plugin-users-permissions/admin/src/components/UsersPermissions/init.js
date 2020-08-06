const init = (state, permissions, routes, policies) => {
  return {
    ...state,
    permissions,
    routes,
    policies,
    pluginName: Object.keys(permissions)[0],
  };
};

export default init;
