const init = (state, permissions) => {
  return {
    ...state,
    initialData: permissions,
    modifiedData: permissions,
  };
};

export default init;
