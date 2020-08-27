const init = (state, permissions, routes, policies) => {
  return {
    ...state,
    modifiedData: permissions,
    permissions,
    // TO REMOVE
    routes,
    policies,
    pluginName: Object.keys(permissions)[0],
  };
};

export default init;
