const initialState: {
  initialData: Partial<ConfigData>;
  modifiedData: Partial<ConfigData>;
} = {
  initialData: {},
  modifiedData: {},
};

interface ConfigData {
  sort: string;
  pageSize: number;
}

const init = (configData: ConfigData) => {
  return {
    ...initialState,
    initialData: configData,
    modifiedData: configData,
  };
};
export { init, initialState };
