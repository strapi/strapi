const initialState = {
  initialData: {},
  modifiedData: {},
};

const init = (configData) => {
  return {
    ...initialState,
    initialData: configData,
    modifiedData: configData,
  };
};
export { init, initialState };
