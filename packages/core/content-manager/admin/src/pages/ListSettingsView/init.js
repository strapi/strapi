const init = (initialState, layout) => {
  return {
    ...initialState,
    initialData: layout,
    modifiedData: layout,
  };
};

export default init;
