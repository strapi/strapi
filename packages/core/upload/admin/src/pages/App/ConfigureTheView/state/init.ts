type InitialState = {
  initialData: Record<string, string | number> | {};
  modifiedData: Record<string, string | number> | {};
};

const initialState: InitialState = {
  initialData: {},
  modifiedData: {},
};

const init = (configData: InitialState['initialData']) => {
  return {
    ...initialState,
    initialData: configData,
    modifiedData: configData,
  };
};
export { init, initialState };
