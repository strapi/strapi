const init = (state, permissions, routes, policies) => {
  return {
    ...state,
    initialData: permissions,
    modifiedData: permissions,
    routes,
    policies,
  };
};

export default init;
